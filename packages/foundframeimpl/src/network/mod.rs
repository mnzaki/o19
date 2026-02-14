use std::collections::HashMap;
use std::convert::Infallible;
use std::str::FromStr;
use std::sync::Arc;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

use crate::error::Result;
use crate::log;
use futures_util::StreamExt;
use iroh::EndpointAddr;
use p2panda_core::cbor::{decode_cbor, encode_cbor};
use p2panda_core::{Body, Hash, Header, Operation, PrivateKey, PublicKey};
use p2panda_net::addrs::NodeInfo;
use p2panda_net::gossip::GossipSubscription;
use p2panda_net::iroh_endpoint::from_public_key;
use p2panda_net::iroh_mdns::MdnsDiscoveryMode;
use p2panda_net::utils::ShortFormat;
use p2panda_net::{
    AddressBook, Discovery, Endpoint, Gossip, LogSync, MdnsDiscovery, NodeId, TopicId,
};
use p2panda_store::{MemoryStore, OperationStore};
use p2panda_sync::protocols::{Logs, TopicLogSyncEvent as SyncEvent};
use p2panda_sync::traits::TopicMap;
use rand::{RngExt, SeedableRng};
use rand_chacha::ChaCha12Rng;
use serde::{Deserialize, Serialize};
use tokio::sync::RwLock;
use tokio::time::Instant;
use tracing::{info, error};
use tracing_subscriber::EnvFilter;
use tracing_subscriber::prelude::*;

use crate::error::Error;

type LogId = u64;

/// This application maintains only one log per author, this is why we can hard-code it.
const LOG_ID: LogId = 1;

const RELAY_URL: &str = "https://euc1-1.relay.n0.iroh-canary.iroh.link";

/// Heartbeat message to be sent over gossip (ephemeral messaging).
#[derive(Debug, Serialize, Deserialize)]
struct Heartbeat {
    sender: PublicKey,
    online: bool,
    rnd: u64,
}

pub struct NetworkService {
    address_book: AddressBook
}

impl NetworkService {
    pub async fn init() -> Result<NetworkService> {
        let private_key = PrivateKey::new();
        let public_key = private_key.public_key();

        // Retrieve the chat topic ID from the provided arguments, otherwise generate a new, random,
        // cryptographically-secure identifier.
        let topic_id: TopicId = if let Some(topic) = Some("11223344556677889900aabbccddeeff11223344556677889900aabbccddeeff") { //args.chat_topic_id {
            let topic_id = hex::decode(topic)?;
            topic_id.try_into().expect("topic id should be 32 bytes")
        } else {
            let mut rng = ChaCha12Rng::from_rng(&mut rand::rng());
            rng.random()
        };

        // Set up sync for p2panda operations.
        let mut store = ChatStore::new();

        let topic_map = ChatTopicMap::default();
        topic_map.insert(topic_id, public_key, LOG_ID).await;

        // Prepare address book.
        let address_book = AddressBook::builder().spawn().await?;

        // Add a bootstrap node to our address book if one was supplied by the user.
        //if let Some(id) = args.bootstrap_id {
        //    let endpoint_addr = EndpointAddr::new(from_public_key(id));
        //    let endpoint_addr = endpoint_addr.with_relay_url(RELAY_URL.parse()?);
        //    address_book
        //        .insert_node_info(NodeInfo::from(endpoint_addr).bootstrap())
        //        .await?;
        //}

        let endpoint = Endpoint::builder(address_book.clone())
            .private_key(private_key.clone())
            .relay_url(RELAY_URL.parse().unwrap())
            .spawn()
            .await?;

        info!("network id: {}", endpoint.network_id().fmt_short());
        info!("chat topic id: {}", hex::encode(topic_id));
        info!("public key: {}", public_key.to_hex());
        info!("relay url: {}", RELAY_URL);

        let _discovery = Discovery::builder(address_book.clone(), endpoint.clone())
            .spawn()
            .await?;

        let mdns_discovery_mode = if true { //args.mdns {
            MdnsDiscoveryMode::Active
        } else {
            MdnsDiscoveryMode::Passive
        };
        let _mdns = MdnsDiscovery::builder(address_book.clone(), endpoint.clone())
            .mode(mdns_discovery_mode)
            .spawn()
            .await?;

        start_gossip(&address_book, &endpoint, &topic_id, &public_key).await.unwrap();

        let sync = LogSync::builder(store.clone(), topic_map.clone(), endpoint, gossip)
            .spawn()
            .await?;

        let sync_tx = sync.stream(topic_id, true).await?;
        let mut sync_rx = sync_tx.subscribe()
            .await
            .map_err(|e| Error::Sync(e.to_string()))
            .unwrap();

        // Receive messages from the sync stream.
        {
            let mut store = store.clone();
            let nicknames = Arc::clone(&nicknames);
            tokio::task::spawn(async move {
                while let Some(Ok(from_sync)) = sync_rx.next().await {
                    match from_sync.event {
                        SyncEvent::SyncFinished(metrics) => {
                            info!(
                                "finished sync session with {}, bytes received = {}, bytes sent = {}",
                                from_sync.remote.fmt_short(),
                                metrics.total_bytes_remote.unwrap_or_default(),
                                metrics.total_bytes_local.unwrap_or_default()
                            );
                        }
                        SyncEvent::Operation(operation) => {
                            if store.has_operation(operation.hash).await.unwrap() {
                                continue;
                            }

                            let remote_public_key = operation.header.public_key;
                            let remote_id = remote_public_key.fmt_short();

                            let text =
                                String::from_utf8(operation.body.as_ref().unwrap().to_bytes()).unwrap();

                            // Check if the text of this operation is setting a nickname.
                            if let Some(nick) = text.strip_prefix("/nick ") {
                                if let Some(previous_nick) =
                                    nicknames.read().await.get(&remote_public_key)
                                {
                                    print!("-> {} is now known as: {}", previous_nick, nick);
                                } else {
                                    print!("-> {} is now known as: {}", remote_id, nick);
                                }

                                // Update the nicknames map.
                                nicknames
                                    .write()
                                    .await
                                    .insert(remote_public_key, nick.trim().to_owned());
                            } else {
                                // Print a regular chat message.
                                print!(
                                    "{}: {}",
                                    nicknames
                                        .read()
                                        .await
                                        .get(&remote_public_key)
                                        .unwrap_or(&remote_id),
                                    text
                                )
                            }

                            store
                                .insert_operation(
                                    operation.hash,
                                    &operation.header,
                                    operation.body.as_ref(),
                                    &operation.header.to_bytes(),
                                    &LOG_ID,
                                )
                                .await
                                .unwrap();

                            topic_map
                                .insert(topic_id, operation.header.public_key, LOG_ID)
                                .await;
                        }
                        _ => (),
                    }
                }
            });
        }

        Ok(NetworkService {
            address_book,
        })
    }

    pub async fn add_bootstrap_node(&self, pub_key: String) -> Result<()> {
        let node_id = NodeId::from_str(&pub_key)?;
        let endpoint_addr = EndpointAddr::new(from_public_key(node_id));
        log::info!("adding bootstrap node: {} : {} : {:?}", pub_key, node_id, endpoint_addr.ip_addrs().last());
        let relay_url = RELAY_URL.parse()
            .map_err(|_| Error::InvalidUrl(RELAY_URL.to_string()))
            .unwrap();
        let endpoint_addr = endpoint_addr.with_relay_url(relay_url);
        log::info!("endpoint with relay url: {:?}", endpoint_addr.ip_addrs().last());
        self.address_book
            .insert_node_info(NodeInfo::from(endpoint_addr).bootstrap())
            .await?;
        log::info!("added successfully");
        Ok(())
    }

}

impl Heartbeat {
    fn new(sender: PublicKey, online: bool) -> Self {
        Self {
            sender,
            online,
            rnd: rand::random(),
        }
    }
}

#[derive(Clone, Default, Debug)]
pub struct ChatTopicMap(Arc<RwLock<HashMap<TopicId, Logs<LogId>>>>);

impl ChatTopicMap {
    async fn insert(&self, topic_id: TopicId, node_id: NodeId, log_id: LogId) {
        let mut map = self.0.write().await;
        map.entry(topic_id)
            .and_modify(|logs| {
                logs.insert(node_id, vec![log_id]);
            })
            .or_insert({
                let mut value = HashMap::new();
                value.insert(node_id, vec![log_id]);
                value
            });
    }
}

impl TopicMap<TopicId, Logs<LogId>> for ChatTopicMap {
    type Error = Infallible;

    async fn get(&self, topic_query: &TopicId) -> std::result::Result<Logs<LogId>, Self::Error> {
        let map = self.0.read().await;
        Ok(map.get(topic_query).cloned().unwrap_or_default())
    }
}

type ChatStore = MemoryStore<LogId, ()>;

async fn start_gossip(address_book: &AddressBook, endpoint: &Endpoint, topic_id: &TopicId, public_key: &PublicKey) -> Result<()> {
    // Publish (ephemeral) heartbeat messages.
    tokio::task::spawn(async move {
        let mut gossip = Gossip::builder(address_book.clone(), endpoint.clone())
            .spawn()
            .await
            .unwrap();

        // Subscribe to gossip overlay to receive and publish (ephemeral) messages.
        let mut heartbeat_tx = gossip.stream(topic_id.clone()).await.unwrap();
        let mut heartbeat_rx = heartbeat_tx.subscribe();

        //let final_heartbeat_tx = heartbeat_tx.clone();

        // Mapping of public key to nickname.
        let nicknames = Arc::new(RwLock::new(HashMap::<PublicKey, String>::new()));

        // Mapping of public key to the instant that the last heartbeat message was received.
        let status = Arc::new(RwLock::new(HashMap::new()));

        loop {
            // Create and serialize a heartbeat message.
            let msg = Heartbeat::new(public_key.clone(), true);
            let encoded_msg = encode_cbor(&msg).unwrap();

            let result: anyhow::Result<(), anyhow::Error> = async {
            // Publish the message to the gossip topic.
            heartbeat_tx.publish(encoded_msg).await?;
            info!("sent heartbeat!");
            //if let Err(e) = heartbeat_result {
            //    error!("CRITICAL NETWORK FAILURE: The networking background task has died.");
            //    error!("CRITICAL NETWORK FAILURE: The networking background task has died.");
            //    error!("CRITICAL NETWORK FAILURE: The networking background task has died.");
            //    error!("CRITICAL NETWORK FAILURE: The networking background task has died.");
            //    error!("CRITICAL NETWORK FAILURE: The networking background task has died.");
            //    error!("CRITICAL NETWORK FAILURE: The networking background task has died.");


            //    error!("Failed to send message: {:?}", e.0);

            //    error!("CRITICAL NETWORK FAILURE: The networking background task has died.");
            //    error!("CRITICAL NETWORK FAILURE: The networking background task has died.");
            //    error!("CRITICAL NETWORK FAILURE: The networking background task has died.");
            //}

            Ok::<(), anyhow::Error>(())
            }.await;

            if let Err(e) = result {
                error!("Failed to send message: {}", e);
                gossip = Gossip::builder(address_book.clone(), endpoint.clone())
                    .spawn()
                    .await
                    .unwrap();

                // Subscribe to gossip overlay to receive and publish (ephemeral) messages.
                heartbeat_tx = gossip.stream(topic_id.clone()).await.unwrap();
                heartbeat_rx = heartbeat_tx.subscribe();
                let receiver = receive_heartbeats(heartbeat_rx, &nicknames, &status).await.unwrap();
            }

            tokio::time::sleep(Duration::from_secs(rand::random_range(20..30))).await;
        }
    });

    Ok(())
}

async fn receive_heartbeats(mut heartbeat_rx: GossipSubscription, nicknames: &Arc<RwLock<HashMap<PublicKey, String>>>, status: &Arc<RwLock<HashMap<PublicKey, Instant>>>) -> Result<tokio::task::JoinHandle<()>> {
    // Receive and log each (ephemeral) heartbeat message.
    let nicknames = Arc::clone(&nicknames);
    let status = Arc::clone(&status);
    Ok(tokio::spawn(async move {
        loop {
            if let Some(Ok(message)) = heartbeat_rx.next().await {
                let msg: Heartbeat = decode_cbor(&message[..]).expect("valid cbor encoding");

                info!("received heartbeat: {:?}", msg);

                // Look up nickname for sender.
                let name = if let Some(nickname) = nicknames.read().await.get(&msg.sender) {
                    nickname.to_owned()
                } else {
                    msg.sender.fmt_short()
                };

                // Update status hashmap.
                if status
                    .write()
                    .await
                    .insert(msg.sender, Instant::now())
                    .is_none()
                {
                    println!("-> {} came online", name)
                }

                if !msg.online {
                    status.write().await.remove(&msg.sender);
                    println!("-> {} went offline", name)
                }
            } else {
                break;
            }
        }
    }))
}

/*
async fn send_text(store: &ChatStore, sync_tx: &LogSync, text: String, private_key: &PrivateKey, seq_num: u64, backlink: Option<Hash>) {
    let body = Body::new(text.as_bytes());
    let (hash, header, header_bytes, operation) =
        create_operation(&private_key, &body, seq_num, backlink);
    store
        .insert_operation(hash, &header, Some(&body), &header_bytes, &LOG_ID)
        .await
        .unwrap();

    sync_tx.publish(operation).await.unwrap();

    seq_num += 1;
    backlink = Some(hash);

    // Update the nickname mapping for the local node.
    if let Some(nick) = text.strip_prefix("/nick ") {
        print!("-> changed nick to: {}", nick);
    }

    Ok(())
}

async fn send_last_heartbeat() {
    // Create and serialize a final heartbeat message.
    //
    // This informs other chatters that we are going offline.
    let msg = Heartbeat::new(public_key, false);
    let encoded_msg = encode_cbor(&msg)?;

    final_heartbeat_tx.publish(&encoded_msg[..]).await?;

    // Sleep briefly to allow sending of heartbeat message.
    tokio::time::sleep(Duration::from_millis(500)).await;

    Ok(())
}
*/

fn create_operation(
    private_key: &PrivateKey,
    body: &Body,
    seq_num: u64,
    backlink: Option<Hash>,
) -> (Hash, Header, Vec<u8>, Operation) {
    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs();

    let mut header = Header {
        version: 1,
        public_key: private_key.public_key(),
        signature: None,
        payload_size: body.size(),
        payload_hash: Some(body.hash()),
        timestamp,
        seq_num,
        backlink,
        previous: vec![],
        extensions: (),
    };

    header.sign(private_key);
    let header_bytes = header.to_bytes();
    let hash = header.hash();

    let operation = Operation {
        hash,
        header: header.clone(),
        body: Some(body.to_owned()),
    };

    (hash, header, header_bytes, operation)
}

//! Signal/Event Bus Tests (P0)
//!
//! Tests for the pub/sub event system - core infrastructure for all async communication.

use o19_foundframe::signal::{EventBus, PkbEvent};
use o19_foundframe::pkb::{DirectoryId, EntryId};

/// A test event type
#[derive(Debug, Clone, PartialEq)]
struct TestEvent {
    value: i32,
    message: String,
}

/// Another test event type (to verify type isolation)
#[derive(Debug, Clone, PartialEq)]
struct OtherEvent {
    data: Vec<u8>,
}

#[test]
fn test_subscribe_receive_emit() {
    let bus = EventBus::new();
    let rx = bus.subscribe::<TestEvent>();
    
    let event = TestEvent {
        value: 42,
        message: "hello".to_string(),
    };
    
    bus.emit(event.clone());
    
    let received = rx.recv().expect("Should receive event");
    assert_eq!(received, event);
}

#[test]
fn test_multiple_subscribers_receive_event() {
    let bus = EventBus::new();
    let rx1 = bus.subscribe::<TestEvent>();
    let rx2 = bus.subscribe::<TestEvent>();
    
    let event = TestEvent {
        value: 100,
        message: "broadcast".to_string(),
    };
    
    bus.emit(event.clone());
    
    let received1 = rx1.try_recv().expect("Subscriber 1 should receive");
    let received2 = rx2.try_recv().expect("Subscriber 2 should receive");
    
    assert_eq!(received1, event);
    assert_eq!(received2, event);
}

#[test]
fn test_dropped_subscriber_removed() {
    let bus = EventBus::new();
    
    {
        let rx = bus.subscribe::<TestEvent>();
        bus.emit(TestEvent { value: 1, message: "first".to_string() });
        
        // Should receive while subscriber exists
        assert!(rx.try_recv().is_ok());
        
        // rx dropped here
    }
    
    // Emit again - should not panic even though subscriber is gone
    bus.emit(TestEvent { value: 2, message: "second".to_string() });
    
    // If we get here without panic, the test passes
}

#[test]
fn test_type_safety_no_cross_contamination() {
    let bus = EventBus::new();
    let test_rx = bus.subscribe::<TestEvent>();
    let other_rx = bus.subscribe::<OtherEvent>();
    
    // Emit TestEvent
    bus.emit(TestEvent { value: 42, message: "test".to_string() });
    
    // TestEvent subscriber should receive
    assert!(test_rx.try_recv().is_ok());
    
    // OtherEvent subscriber should NOT receive (different type)
    assert!(other_rx.try_recv().is_err()); // Would be empty/disconnected
}

#[test]
fn test_try_emit_non_blocking() {
    let bus = EventBus::new();
    
    // No subscribers - try_emit should not panic or block
    bus.try_emit(TestEvent { value: 0, message: "into the void".to_string() });
    
    // Test passes if we reach here
}

#[test]
fn test_events_received_in_order() {
    let bus = EventBus::new();
    let rx = bus.subscribe::<TestEvent>();
    
    // Emit multiple events
    for i in 0..5 {
        bus.emit(TestEvent {
            value: i,
            message: format!("event {}", i),
        });
    }
    
    // Receive in order
    for i in 0..5 {
        let event = rx.recv().expect("Should receive event");
        assert_eq!(event.value, i);
        assert_eq!(event.message, format!("event {}", i));
    }
}

#[test]
fn test_pkb_event_emit_and_receive() {
    let bus = EventBus::new();
    let rx = bus.subscribe::<PkbEvent>();
    
    let event = PkbEvent::EntryCreated {
        directory: DirectoryId::from("notes"),
        entry_id: EntryId::new([0u8; 32]),
        path: std::path::PathBuf::from("test.md"),
    };
    
    bus.emit(event.clone());
    
    let received = rx.recv().expect("Should receive PKB event");
    match (received, event) {
        (
            PkbEvent::EntryCreated { directory: d1, .. },
            PkbEvent::EntryCreated { directory: d2, .. }
        ) => assert_eq!(d1, d2),
        _ => panic!("Event type mismatch"),
    }
}

#[test]
fn test_new_subscriber_doesnt_get_old_events() {
    let bus = EventBus::new();
    
    // Emit before subscription
    bus.emit(TestEvent { value: 1, message: "old".to_string() });
    
    // Subscribe after
    let rx = bus.subscribe::<TestEvent>();
    
    // Emit new event
    bus.emit(TestEvent { value: 2, message: "new".to_string() });
    
    // Should only receive the new event
    let received = rx.recv().expect("Should receive");
    assert_eq!(received.value, 2);
    assert_eq!(received.message, "new");
    
    // No more events
    assert!(rx.try_recv().is_err());
}

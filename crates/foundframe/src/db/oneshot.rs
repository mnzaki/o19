//! Oneshot channel for actor communication

pub use crossbeam_channel::{Receiver, Sender};
use crossbeam_channel::bounded;

pub fn channel<T>() -> (Sender<T>, Receiver<T>) {
  bounded(1)
}

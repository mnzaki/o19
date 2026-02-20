//! Platform Trait
//!
//! Auto-generated from IDeviceMgmt

pub trait DeviceMgmt: Send + Sync {
    fn generate_pairing_code(&self) -> Result<String, Box<dyn std::error::Error>>;
    fn confirm_pairing(&self, device_id: String, code: String) -> Result<bool, Box<dyn std::error::Error>>;
    fn unpair_device(&self, device_id: String) -> ();
    fn list_paired_devices(&self) -> Result<(), Box<dyn std::error::Error>>;
    fn follow_device(&self, device_id: String) -> Result<bool, Box<dyn std::error::Error>>;
    fn unfollow_device(&self, device_id: String) -> ();
    fn list_followers(&self) -> Result<(), Box<dyn std::error::Error>>;
    fn is_following(&self, device_id: String) -> Result<bool, Box<dyn std::error::Error>>;
}

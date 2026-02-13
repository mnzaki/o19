import Foundation

struct Preferences {
  private let regionKey = "region"

  var region: String {
    get {
      return UserDefaults.standard.string(forKey: regionKey) ?? "europe-west"
    }
    set {
      UserDefaults.standard.set(newValue, forKey: regionKey)
    }
  }

  static let shared = Preferences()
}

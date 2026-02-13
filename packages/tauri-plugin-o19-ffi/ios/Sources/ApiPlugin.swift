import SwiftRs
import Tauri
import UIKit
import UserNotifications
import WebKit

class ApiPlugin: Plugin, UNUserNotificationCenterDelegate {
  private var originalDelegate: UIApplicationDelegate?

  let requests = Requests()

  var preferences = Preferences.shared

  override init() {
    super.init()
    UNUserNotificationCenter.current().delegate = self
  }

  @objc override public func load(webview: WKWebView) {
    super.load(webview: webview)

    if let app = UIApplication.value(forKey: "sharedApplication") as? UIApplication {
      self.originalDelegate = app.delegate
      app.delegate = self
    }
  }

  @objc override public func requestPermissions(_ invoke: Invoke) {
    UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge]) {
      granted, error in
      DispatchQueue.main.async {
        if granted {
          UIApplication.shared.registerForRemoteNotifications()
        }

        let status = granted ? "granted" : "denied"
        invoke.resolve(["status": status])
      }
    }
  }
}

extension ApiPlugin: UIApplicationDelegate {
  public func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
  ) -> Bool {
    return self.originalDelegate?.application?(
      application, didFinishLaunchingWithOptions: launchOptions) ?? true
  }

  public func application(
    _ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error
  ) {
    self.originalDelegate?.application?(
      application, didFailToRegisterForRemoteNotificationsWithError: error)
  }

  public func application(
    _ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data
  ) {
    let token = deviceToken.map { String(format: "%02.2hhx", $0) }.joined()
    requests.registerDeviceToken(token)
    self.originalDelegate?.application?(
      application, didRegisterForRemoteNotificationsWithDeviceToken: deviceToken)
  }

  public func application(
    _ application: UIApplication, didReceiveRemoteNotification userInfo: [AnyHashable: Any],
    fetchCompletionHandler completionHandler: @escaping (UIBackgroundFetchResult) -> Void
  ) {
    self.originalDelegate?.application?(
      application, didReceiveRemoteNotification: userInfo, fetchCompletionHandler: completionHandler
    )
  }

  public func application(
    _ application: UIApplication, open url: URL,
    options: [UIApplication.OpenURLOptionsKey: Any] = [:]
  ) -> Bool {
    return self.originalDelegate?.application?(application, open: url, options: options) ?? false
  }

  public func application(
    _ application: UIApplication, continue continueUserActivity: NSUserActivity,
    restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void
  ) -> Bool {
    return self.originalDelegate?.application?(
      application, continue: continueUserActivity, restorationHandler: restorationHandler) ?? false
  }

  public func applicationDidBecomeActive(_ application: UIApplication) {
    self.originalDelegate?.applicationDidBecomeActive?(application)
  }

  public func applicationWillResignActive(_ application: UIApplication) {
    self.originalDelegate?.applicationWillResignActive?(application)
  }

  public func applicationWillEnterForeground(_ application: UIApplication) {
    self.originalDelegate?.applicationWillEnterForeground?(application)
  }

  public func applicationDidEnterBackground(_ application: UIApplication) {
    self.originalDelegate?.applicationDidEnterBackground?(application)
  }

  public func applicationWillTerminate(_ application: UIApplication) {
    self.originalDelegate?.applicationWillTerminate?(application)
  }
}

@_cdecl("init_plugin_internal_api")
func initPlugin() -> Plugin {
  return ApiPlugin()
}

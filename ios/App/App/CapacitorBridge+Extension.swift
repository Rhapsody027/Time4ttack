import Foundation
import Capacitor

// 🚀 透過 Swift Extension 物理擴充 Capacitor 的核心控制器生命週期
extension CAPBridgeViewController {
    open override func capacitorDidLoad() {
        super.capacitorDidLoad()

        // 🚀 強制將我們的本地自製 mDNS 插件實例注入全域 Bridge
        self.bridge?.registerPluginInstance(MdnsBridgePlugin())
        print("[Native Extension] 🚀 已成功全自動掛載本地自製 MdnsBridgePlugin 實例！")
    }
}

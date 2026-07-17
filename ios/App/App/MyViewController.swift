import UIKit
import Capacitor

class MyViewController: CAPBridgeViewController {
    
    // 🚀 100% 嚴格對齊官方文件規範的註冊 Hook
    override open func capacitorDidLoad() {
        super.capacitorDidLoad()
        
        // 🚀 傳入我們自製的 mDNS 插件實例完成註冊
        bridge?.registerPluginInstance(MdnsBridgePlugin())
        print("[Native UI] 🚀 成功在 MyViewController 中註冊本地自製 MdnsBridgePlugin 實例！")
    }
}

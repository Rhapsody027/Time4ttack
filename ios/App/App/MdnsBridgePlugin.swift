import Foundation
import Capacitor
import Network

@objc(MdnsBridgePlugin)
public class MdnsBridgePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "MdnsBridgePlugin"
    public let jsName = "MdnsBridge"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "startDiscovery", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stopDiscovery", returnType: CAPPluginReturnPromise)
    ]
    
    private var browser: NWBrowser?
    private var isSearching = false
    
    @objc func startDiscovery(_ call: CAPPluginCall) {
        if isSearching {
            call.resolve(["status": "already_searching"])
            return
        }
        
        let parameters = NWParameters()
        parameters.includePeerToPeer = true
        
        let descriptor = NWBrowseDescriptor.bonjour(type: "_fh6hub._tcp", domain: "local.")
        browser = NWBrowser(descriptor: descriptor, parameters: parameters)
        
        browser?.browseResultsChangedHandler = { [weak self] results, changes in
            guard let self = self else { return }
            for result in results {
                if case let .bonjour(txtRecord) = result.metadata {
                    if case let .hostPort(host, port) = result.endpoint {
                        var ipAddress = ""
                        switch host {
                        case .ipv4(let ipv4Address):
                            ipAddress = ipv4Address.debugDescription
                        case .name(let name, _):
                            ipAddress = name.replacingOccurrences(of: ".local", with: "")
                        default:
                            continue
                        }
                        
                        if !ipAddress.isEmpty && !ipAddress.contains(":") {
                            let data: [String: Any] = [
                                "name": "Time4ttack-FH6-Hub",
                                "ip": ipAddress,
                                "port": Int(port.rawValue)
                            ]
                            self.notifyListeners("onHubDiscovered", data: data)
                        }
                    }
                }
            }
        }
        
        browser?.stateUpdateHandler = { state in
            switch state {
            case .failed(let error):
                print("[Native mDNS] Browser 失敗: \(error)")
            default:
                break
            }
        }
        
        browser?.start(queue: .main)
        isSearching = true
        call.resolve(["status": "started"])
    }
    
    @objc func stopDiscovery(_ call: CAPPluginCall) {
        browser?.cancel()
        browser = nil
        isSearching = false
        call.resolve(["status": "stopped"])
    }
}


import UIKit
import Social
import MobileCoreServices
import UniformTypeIdentifiers

@objc(ShareViewController)
class ShareViewController: UIViewController {
    
    private let appGroupIdentifier = "group.ai.shopwell.app"
    private let urlScheme = "shopwellaimobile"
    
    override func viewDidLoad() {
        super.viewDidLoad()
        
        // Set up the view
        view.backgroundColor = .systemBackground
        
        // Add a simple UI to show processing
        let label = UILabel()
        label.text = "Opening ShopWell.ai..."
        label.textAlignment = .center
        label.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(label)
        
        NSLayoutConstraint.activate([
            label.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            label.centerYAnchor.constraint(equalTo: view.centerYAnchor)
        ])
        
        // Handle the shared content
        handleSharedContent()
    }
    
    private func handleSharedContent() {
        guard let extensionItem = extensionContext?.inputItems.first as? NSExtensionItem,
              let itemProvider = extensionItem.attachments?.first else {
            closeExtension()
            return
        }
        
        // Check for URL (web pages from Safari and other browsers)
        if itemProvider.hasItemConformingToTypeIdentifier(UTType.url.identifier) {
            itemProvider.loadItem(forTypeIdentifier: UTType.url.identifier, options: nil) { [weak self] (item, error) in
                if let url = item as? URL {
                    self?.openMainApp(with: url.absoluteString)
                } else if let data = item as? Data, let url = URL(dataRepresentation: data, relativeTo: nil) {
                    self?.openMainApp(with: url.absoluteString)
                } else {
                    self?.closeExtension()
                }
            }
            return
        }
        
        // Check for plain text that might be a URL
        if itemProvider.hasItemConformingToTypeIdentifier(UTType.plainText.identifier) {
            itemProvider.loadItem(forTypeIdentifier: UTType.plainText.identifier, options: nil) { [weak self] (item, error) in
                if let text = item as? String {
                    // Only process if it's a valid URL
                    if text.hasPrefix("http://") || text.hasPrefix("https://") {
                        self?.openMainApp(with: text)
                    } else {
                        self?.closeExtension()
                    }
                } else {
                    self?.closeExtension()
                }
            }
            return
        }
        
        // No supported content type found
        closeExtension()
    }
    
    private func openMainApp(with urlString: String) {
        // URL encode the content
        guard let encodedURL = urlString.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) else {
            closeExtension()
            return
        }
        
        // Create deep link URL pointing to share-target route
        // Format: shopwellaimobile://share-target?productUrl=https://example.com
        let deepLinkURL = "\(urlScheme)://share-target?productUrl=\(encodedURL)"
        
        // Store in app group for backup
        if let sharedContainer = UserDefaults(suiteName: appGroupIdentifier) {
            sharedContainer.set(urlString, forKey: "sharedContent")
            sharedContainer.set("url", forKey: "sharedContentType")
            sharedContainer.set(Date().timeIntervalSince1970, forKey: "sharedContentTimestamp")
            sharedContainer.synchronize()
        }
        
        // Open main app
        DispatchQueue.main.async { [weak self] in
            if let url = URL(string: deepLinkURL) {
                self?.openURL(url)
            } else {
                self?.closeExtension()
            }
        }
    }
    
    @objc private func openURL(_ url: URL) {
        var responder: UIResponder? = self
        while responder != nil {
            if let application = responder as? UIApplication {
                application.perform(#selector(openURL(_:)), with: url)
                break
            }
            responder = responder?.next
        }
        
        // Close the extension after a short delay
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) { [weak self] in
            self?.closeExtension()
        }
    }
    
    private func closeExtension() {
        extensionContext?.completeRequest(returningItems: [], completionHandler: nil)
    }
}


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
        
        // Check for URL (most common - web pages from Safari)
        if itemProvider.hasItemConformingToTypeIdentifier(UTType.url.identifier) {
            itemProvider.loadItem(forTypeIdentifier: UTType.url.identifier, options: nil) { [weak self] (item, error) in
                if let url = item as? URL {
                    self?.openMainApp(with: url.absoluteString, type: "url")
                } else if let data = item as? Data, let url = URL(dataRepresentation: data, relativeTo: nil) {
                    self?.openMainApp(with: url.absoluteString, type: "url")
                } else {
                    self?.closeExtension()
                }
            }
            return
        }
        
        // Check for plain text
        if itemProvider.hasItemConformingToTypeIdentifier(UTType.plainText.identifier) {
            itemProvider.loadItem(forTypeIdentifier: UTType.plainText.identifier, options: nil) { [weak self] (item, error) in
                if let text = item as? String {
                    // Check if text is a URL
                    let isUrl = text.hasPrefix("http://") || text.hasPrefix("https://")
                    self?.openMainApp(with: text, type: isUrl ? "url" : "text")
                } else {
                    self?.closeExtension()
                }
            }
            return
        }
        
        // Check for image
        if itemProvider.hasItemConformingToTypeIdentifier(UTType.image.identifier) {
            itemProvider.loadItem(forTypeIdentifier: UTType.image.identifier, options: nil) { [weak self] (item, error) in
                var imageURL: URL?
                
                if let url = item as? URL {
                    imageURL = url
                } else if let data = item as? Data {
                    // Save image data to shared container
                    if let sharedContainer = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: self?.appGroupIdentifier ?? "") {
                        let fileName = "shared-image-\(Date().timeIntervalSince1970).jpg"
                        let fileURL = sharedContainer.appendingPathComponent(fileName)
                        try? data.write(to: fileURL)
                        imageURL = fileURL
                    }
                } else if let image = item as? UIImage, let data = image.jpegData(compressionQuality: 0.8) {
                    // Save UIImage to shared container
                    if let sharedContainer = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: self?.appGroupIdentifier ?? "") {
                        let fileName = "shared-image-\(Date().timeIntervalSince1970).jpg"
                        let fileURL = sharedContainer.appendingPathComponent(fileName)
                        try? data.write(to: fileURL)
                        imageURL = fileURL
                    }
                }
                
                if let imageURL = imageURL {
                    self?.openMainApp(with: imageURL.absoluteString, type: "image")
                } else {
                    self?.closeExtension()
                }
            }
            return
        }
        
        // No supported content type found
        closeExtension()
    }
    
    private func openMainApp(with content: String, type: String) {
        // URL encode the content
        guard let encodedContent = content.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) else {
            closeExtension()
            return
        }
        
        // Create deep link URL pointing to share-target route
        // Format: shopwellaimobile://share-target?type=url&content=https://example.com
        let deepLinkURL = "\(urlScheme)://share-target?type=\(type)&content=\(encodedContent)"
        
        // Store in app group for backup
        if let sharedContainer = UserDefaults(suiteName: appGroupIdentifier) {
            sharedContainer.set(content, forKey: "sharedContent")
            sharedContainer.set(type, forKey: "sharedContentType")
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

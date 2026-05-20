import ExpoModulesCore
import MLKitDigitalInkRecognition
import MLKitCommon

public class DigitalInkModule: Module {
  public func definition() -> ModuleDefinition {
    Name("DigitalInk")

    AsyncFunction("isModelDownloaded") { (language: String, promise: Promise) in
      guard let model = Self.makeModel(language: language) else {
        promise.reject("E_INVALID_LANG", "Unknown ML Kit language tag: \(language)")
        return
      }
      promise.resolve(ModelManager.modelManager().isModelDownloaded(model))
    }

    AsyncFunction("downloadModel") { (language: String, promise: Promise) in
      guard let model = Self.makeModel(language: language) else {
        promise.reject("E_INVALID_LANG", "Unknown ML Kit language tag: \(language)")
        return
      }

      let manager = ModelManager.modelManager()
      if manager.isModelDownloaded(model) {
        promise.resolve(nil)
        return
      }

      let conditions = ModelDownloadConditions(
        allowsCellularAccess: true,
        allowsBackgroundDownloading: true
      )
      manager.download(model, conditions: conditions)

      // Pragmatic: poll for completion. Fine for a prototype.
      DispatchQueue.global(qos: .userInitiated).async {
        let deadline = Date().addingTimeInterval(120)
        while !manager.isModelDownloaded(model) {
          if Date() > deadline {
            promise.reject("E_DOWNLOAD_TIMEOUT", "Model download exceeded 120s")
            return
          }
          Thread.sleep(forTimeInterval: 0.5)
        }
        promise.resolve(nil)
      }
    }

    AsyncFunction("recognize") { (language: String, rawStrokes: [[[Double]]], promise: Promise) in
      guard let model = Self.makeModel(language: language) else {
        promise.reject("E_INVALID_LANG", "Unknown ML Kit language tag: \(language)")
        return
      }
      guard ModelManager.modelManager().isModelDownloaded(model) else {
        promise.reject("E_MODEL_NOT_DOWNLOADED", "Call downloadModel(\(language)) first")
        return
      }
      // Cache keeps recognizer alive across async recognize(ink:completion:) call.
      // ML Kit's recognizer does NOT retain itself during the async callback,
      // so a local var would be deallocated before the completion fires.
      let recognizer = Self.recognizer(forLanguage: language, model: model)

      let strokes: [Stroke] = rawStrokes.compactMap { rawStroke in
        let points: [StrokePoint] = rawStroke.compactMap { p in
          guard p.count >= 3 else { return nil }
          return StrokePoint(x: Float(p[0]), y: Float(p[1]), t: Int(p[2]))
        }
        return points.isEmpty ? nil : Stroke(points: points)
      }

      if strokes.isEmpty {
        promise.resolve([])
        return
      }

      let ink = Ink(strokes: strokes)

      recognizer.recognize(ink: ink) { result, error in
        if let error = error {
          promise.reject("E_RECOGNIZE", error.localizedDescription)
          return
        }
        let candidates = (result?.candidates ?? []).map { candidate -> [String: Any] in
          return [
            "text": candidate.text,
            "score": candidate.score?.doubleValue as Any
          ]
        }
        promise.resolve(candidates)
      }
    }
  }

  private static var recognizersByLanguage: [String: DigitalInkRecognizer] = [:]
  private static let recognizersLock = NSLock()

  private static func recognizer(
    forLanguage language: String,
    model: DigitalInkRecognitionModel
  ) -> DigitalInkRecognizer {
    recognizersLock.lock()
    defer { recognizersLock.unlock() }
    if let cached = recognizersByLanguage[language] {
      return cached
    }
    let options = DigitalInkRecognizerOptions(model: model)
    let recognizer = DigitalInkRecognizer.digitalInkRecognizer(options: options)
    recognizersByLanguage[language] = recognizer
    return recognizer
  }

  private static func makeModel(language: String) -> DigitalInkRecognitionModel? {
    guard let identifier = DigitalInkRecognitionModelIdentifier(forLanguageTag: language) else {
      return nil
    }
    return DigitalInkRecognitionModel(modelIdentifier: identifier)
  }
}

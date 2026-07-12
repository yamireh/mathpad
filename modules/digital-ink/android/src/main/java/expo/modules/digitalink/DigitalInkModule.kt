package expo.modules.digitalink

import com.google.mlkit.common.model.DownloadConditions
import com.google.mlkit.common.model.RemoteModelManager
import com.google.mlkit.vision.digitalink.recognition.DigitalInkRecognition
import com.google.mlkit.vision.digitalink.recognition.DigitalInkRecognitionModel
import com.google.mlkit.vision.digitalink.recognition.DigitalInkRecognitionModelIdentifier
import com.google.mlkit.vision.digitalink.recognition.DigitalInkRecognizer
import com.google.mlkit.vision.digitalink.recognition.DigitalInkRecognizerOptions
import com.google.mlkit.vision.digitalink.recognition.Ink
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Android counterpart of `ios/DigitalInkModule.swift`. Same JS API, same error
 * codes, same empty-strokes → `[]` contract, so `lib/recognition` is unchanged.
 * Uses Google ML Kit Digital Ink Recognition; the model is fetched once at
 * runtime via RemoteModelManager (matches the iOS ModelManager download).
 */
class DigitalInkModule : Module() {
  private val remoteModelManager = RemoteModelManager.getInstance()

  // Cache recognizers per language so they survive the async recognize callback
  // (mirrors the iOS recognizer cache).
  private val recognizers = HashMap<String, DigitalInkRecognizer>()

  override fun definition() = ModuleDefinition {
    Name("DigitalInk")

    AsyncFunction("isModelDownloaded") { language: String, promise: Promise ->
      val model = makeModel(language)
      if (model == null) {
        promise.reject("E_INVALID_LANG", "Unknown ML Kit language tag: $language", null)
        return@AsyncFunction
      }
      remoteModelManager.isModelDownloaded(model)
        .addOnSuccessListener { downloaded -> promise.resolve(downloaded) }
        .addOnFailureListener { e -> promise.reject("E_RECOGNIZE", e.localizedMessage, e) }
    }

    AsyncFunction("downloadModel") { language: String, promise: Promise ->
      val model = makeModel(language)
      if (model == null) {
        promise.reject("E_INVALID_LANG", "Unknown ML Kit language tag: $language", null)
        return@AsyncFunction
      }
      remoteModelManager.isModelDownloaded(model)
        .addOnSuccessListener { downloaded ->
          if (downloaded) {
            promise.resolve(null)
            return@addOnSuccessListener
          }
          val conditions = DownloadConditions.Builder().build()
          remoteModelManager.download(model, conditions)
            .addOnSuccessListener { promise.resolve(null) }
            .addOnFailureListener { e ->
              // Android surfaces a real Task failure instead of the iOS poll
              // timeout; reuse the same code so JS behaves identically.
              promise.reject("E_DOWNLOAD_TIMEOUT", e.localizedMessage ?: "Model download failed", e)
            }
        }
        .addOnFailureListener { e -> promise.reject("E_RECOGNIZE", e.localizedMessage, e) }
    }

    AsyncFunction("recognize") { language: String, rawStrokes: List<List<List<Double>>>, promise: Promise ->
      val model = makeModel(language)
      if (model == null) {
        promise.reject("E_INVALID_LANG", "Unknown ML Kit language tag: $language", null)
        return@AsyncFunction
      }
      remoteModelManager.isModelDownloaded(model)
        .addOnSuccessListener downloaded@{ downloaded ->
          if (!downloaded) {
            promise.reject("E_MODEL_NOT_DOWNLOADED", "Call downloadModel($language) first", null)
            return@downloaded
          }

          val inkBuilder = Ink.builder()
          for (rawStroke in rawStrokes) {
            val strokeBuilder = Ink.Stroke.builder()
            for (p in rawStroke) {
              if (p.size >= 3) {
                strokeBuilder.addPoint(
                  Ink.Point.create(p[0].toFloat(), p[1].toFloat(), p[2].toLong())
                )
              }
            }
            val stroke = strokeBuilder.build()
            if (stroke.points.isNotEmpty()) inkBuilder.addStroke(stroke)
          }
          val ink = inkBuilder.build()
          if (ink.strokes.isEmpty()) {
            promise.resolve(emptyList<Map<String, Any?>>())
            return@downloaded
          }

          val recognizer = recognizerFor(language, model)
          recognizer.recognize(ink)
            .addOnSuccessListener { result ->
              val candidates = result.candidates.map { c ->
                mapOf("text" to c.text, "score" to c.score)
              }
              promise.resolve(candidates)
            }
            .addOnFailureListener { e -> promise.reject("E_RECOGNIZE", e.localizedMessage, e) }
        }
        .addOnFailureListener { e -> promise.reject("E_RECOGNIZE", e.localizedMessage, e) }
    }
  }

  private fun makeModel(language: String): DigitalInkRecognitionModel? {
    val identifier =
      try {
        DigitalInkRecognitionModelIdentifier.fromLanguageTag(language)
      } catch (e: Exception) {
        null
      } ?: return null
    return DigitalInkRecognitionModel.builder(identifier).build()
  }

  private fun recognizerFor(
    language: String,
    model: DigitalInkRecognitionModel
  ): DigitalInkRecognizer =
    recognizers.getOrPut(language) {
      DigitalInkRecognition.getClient(DigitalInkRecognizerOptions.builder(model).build())
    }
}

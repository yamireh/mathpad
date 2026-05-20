Pod::Spec.new do |s|
  s.name           = 'DigitalInk'
  s.version        = '1.0.0'
  s.summary        = 'Local Expo module wrapping Google ML Kit Digital Ink Recognition'
  s.description    = 'Thin bridge from React Native to ML Kit Digital Ink Recognition for stroke-based handwriting recognition'
  s.author         = ''
  s.homepage       = 'https://docs.expo.dev/modules/'
  s.platforms      = {
    :ios => '15.5'
  }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'
  s.dependency 'GoogleMLKit/DigitalInkRecognition'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
  }

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
end

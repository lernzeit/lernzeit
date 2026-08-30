require 'json'

package = JSON.parse(File.read(File.join(__dir__, 'package.json')))

Pod::Spec.new do |s|
  s.name = 'LernzeitScreenTime'
  s.version = package['version']
  s.summary = package['description']
  s.license = package['license']
  s.homepage = 'https://lernzeit.app'
  s.author = 'LernZeit'
  s.source = { :git => 'https://github.com/lernzeit/lernzeit.git', :tag => s.version.to_s }
  s.source_files = 'ios/Sources/**/*.{swift,h,m}'
  # Bleibt bei 15.0 wie die App. Die Family-Controls-Aufrufe sind einzeln mit
  # #available(iOS 16.0) abgesichert, damit iOS-15-Geraete die App weiter
  # installieren koennen — sie bekommen dort nur "nicht verfuegbar".
  s.ios.deployment_target = '15.0'
  s.dependency 'Capacitor'
  s.swift_version = '5.1'
end

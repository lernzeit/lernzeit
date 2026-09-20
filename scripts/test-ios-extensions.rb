#!/usr/bin/env ruby
# frozen_string_literal: true

# Prueft scripts/ios-add-extensions.rb gegen ein nachgebautes Xcode-Projekt.
#
#   ruby scripts/test-ios-extensions.rb      (oder: npm run test:ios)
#
# Warum das noetig ist: Das Skript greift in project.pbxproj ein, und ein
# Fehler dort faellt erst 20 Minuten spaeter im Build auf — auf einem
# Mac-Rechner, den hier niemand hat. Diese Pruefung laeuft ueberall, wo Ruby
# und das xcodeproj-Gem vorhanden sind.
#
# Was sie NICHT kann: Swift uebersetzen oder signieren. Dafuer braucht es
# Xcode. Geprueft wird die Projektstruktur, nicht der Code der Erweiterung.
#
#   gem install xcodeproj   (auf Codemagic bereits vorhanden, kommt mit CocoaPods)

require 'fileutils'
require 'tmpdir'

begin
  require 'xcodeproj'
rescue LoadError
  warn 'xcodeproj fehlt. Installieren mit: gem install xcodeproj'
  exit 0 # Kein Fehlschlag — nur nicht pruefbar.
end

REPO = File.expand_path('..', __dir__)
@fehler = 0

def ok(bedingung, text)
  puts "#{bedingung ? '  OK  ' : ' FEHL '} #{text}"
  @fehler += 1 unless bedingung
end

def baue_testprojekt
  FileUtils.mkdir_p('ios/App')
  FileUtils.rm_rf('ios/App/App.xcodeproj')
  project = Xcodeproj::Project.new('ios/App/App.xcodeproj')
  target = project.new_target(:application, 'App', :ios, '15.0')
  target.build_configurations.each do |c|
    c.build_settings['MARKETING_VERSION'] = '1.2.5'
    c.build_settings['CURRENT_PROJECT_VERSION'] = '15'
  end
  project.save
end

def fuehre_aus
  `ruby scripts/ios-add-extensions.rb 2>&1`
end

Dir.mktmpdir('lernzeit-ios-') do |arbeitsordner|
  Dir.chdir(arbeitsordner) do
    FileUtils.mkdir_p('scripts')
    FileUtils.cp(File.join(REPO, 'scripts/ios-add-extensions.rb'), 'scripts/')
    FileUtils.cp_r(File.join(REPO, 'native'), '.')

    # ---- Fall 1: Profil vorhanden ----
    profil_dir = File.expand_path('~/Library/MobileDevice/Provisioning Profiles')
    FileUtils.mkdir_p(profil_dir)
    File.write(File.join(profil_dir, 'monitor.mobileprovision'),
               "<key>Name</key>\n<string>delernzeitapp_monitor_App_Store</string>\n")

    baue_testprojekt
    ausgabe = fuehre_aus
    ok(ausgabe.include?('eingehaengt'), 'Erweiterung wird eingehaengt, wenn das Profil geladen ist')

    project = Xcodeproj::Project.open('ios/App/App.xcodeproj')
    app = project.targets.find { |t| t.name == 'App' }
    ext = project.targets.find { |t| t.name == 'LernZeitMonitor' }

    ok(!ext.nil?, 'Erweiterungsziel existiert')
    ok(ext && ext.product_type == 'com.apple.product-type.app-extension', 'Ziel ist eine App-Erweiterung')

    quellen = ext ? ext.source_build_phase.files.map { |f| f.file_ref.path } : []
    ok(quellen.include?('MonitorExtension.swift'), 'MonitorExtension.swift wird kompiliert')
    ok(quellen.include?('ScreenTimeShared.swift'),
       'ScreenTimeShared.swift wird mitkompiliert — sonst kennt die Erweiterung den Zustand nicht')

    (ext ? ext.build_configurations : []).each do |c|
      s = c.build_settings
      ok(s['PRODUCT_BUNDLE_IDENTIFIER'] == 'de.lernzeit.app.monitor', "#{c.name}: Bundle-ID")
      ok(s['PROVISIONING_PROFILE_SPECIFIER'] == 'delernzeitapp_monitor_App_Store', "#{c.name}: Profil")
      ok(s['CODE_SIGN_ENTITLEMENTS'] == 'LernZeitMonitor/Monitor.entitlements', "#{c.name}: Entitlements")
      ok(s['INFOPLIST_FILE'] == 'LernZeitMonitor/Info.plist', "#{c.name}: Info.plist")
      ok(s['MARKETING_VERSION'] == '1.2.5', "#{c.name}: Version von der App uebernommen")
      ok(s['CURRENT_PROJECT_VERSION'] == '15', "#{c.name}: Buildnummer von der App uebernommen")
      ok(s['IPHONEOS_DEPLOYMENT_TARGET'] == '16.0', "#{c.name}: iOS 16, wegen Family Controls")
    end

    embed = app.copy_files_build_phases.select { |p| p.symbol_dst_subfolder_spec == :plug_ins }
    ok(embed.size == 1, 'Genau eine Phase "Embed App Extensions"')
    ok(embed.first && embed.first.files.any? { |f| f.display_name.include?('LernZeitMonitor') },
       'Erweiterung wird in die App eingebettet — sonst wird sie gebaut, landet aber nicht im Paket')
    ok(app.dependencies.any? { |d| d.target&.name == 'LernZeitMonitor' },
       'App haengt vom Erweiterungsziel ab (Baureihenfolge)')

    plist = File.read('ios/App/LernZeitMonitor/Info.plist')
    ok(plist.include?('com.apple.deviceactivity.monitor-extension'), 'Erweiterungspunkt ist DeviceActivity')
    ok(plist.include?('$(PRODUCT_MODULE_NAME).DeviceActivityMonitorExtension'), 'Hauptklasse zeigt auf die Swift-Klasse')

    ent = File.read('ios/App/LernZeitMonitor/Monitor.entitlements')
    ok(ent.include?('com.apple.developer.family-controls'), 'Entitlement: Family Controls')
    ok(ent.include?('group.de.lernzeit.app'), 'Entitlement: App Group')

    # ---- Fall 2: zweiter Lauf aendert nichts ----
    ausgabe = fuehre_aus
    ok(ausgabe.include?('bereits vorhanden'), 'Zweiter Lauf erkennt das vorhandene Ziel')
    project = Xcodeproj::Project.open('ios/App/App.xcodeproj')
    app = project.targets.find { |t| t.name == 'App' }
    ok(project.targets.count { |t| t.name == 'LernZeitMonitor' } == 1, 'Ziel bleibt genau einmal vorhanden')
    ok(app.copy_files_build_phases.count { |p| p.symbol_dst_subfolder_spec == :plug_ins } == 1,
       'Keine zweite Embed-Phase')

    # ---- Fall 3: Profil fehlt -> Erweiterung weglassen, Build bleibt gruen ----
    FileUtils.rm_f(File.join(profil_dir, 'monitor.mobileprovision'))
    File.write(File.join(profil_dir, 'haupt.mobileprovision'),
               "<key>Name</key>\n<string>delernzeitapp_App_Store</string>\n")
    FileUtils.rm_rf('ios/App/LernZeitMonitor')
    baue_testprojekt
    ausgabe = fuehre_aus
    ok(ausgabe.include?('WEGGELASSEN'), 'Fehlendes Profil: Erweiterung wird weggelassen')
    project = Xcodeproj::Project.open('ios/App/App.xcodeproj')
    ok(project.targets.none? { |t| t.name == 'LernZeitMonitor' },
       'Fehlendes Profil: kein Ziel im Projekt — der Build bleibt gruen')

    FileUtils.rm_rf(File.expand_path('~/Library/MobileDevice'))
  end
end

puts @fehler.zero? ? "\nAlle Pruefungen bestanden." : "\n#{@fehler} FEHLGESCHLAGEN"
exit(@fehler.zero? ? 0 : 1)

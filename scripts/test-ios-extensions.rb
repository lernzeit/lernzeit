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

ERWARTET = [
  { target: 'LernZeitMonitor',      bundle: 'de.lernzeit.app.monitor',
    profil: 'delernzeitapp_monitor_App_Store',      ent: 'Monitor.entitlements',
    quelle: 'MonitorExtension.swift',
    punkt:  'com.apple.deviceactivity.monitor-extension',
    klasse: 'DeviceActivityMonitorExtension' },
  { target: 'LernZeitShield',       bundle: 'de.lernzeit.app.shield',
    profil: 'delernzeitapp_shield_App_Store',       ent: 'Shield.entitlements',
    quelle: 'ShieldConfig.swift',
    punkt:  'com.apple.ManagedSettingsUI.shield-configuration-service',
    klasse: 'ShieldConfigurationExtension' },
  { target: 'LernZeitShieldAction', bundle: 'de.lernzeit.app.shieldaction',
    profil: 'delernzeitapp_shieldaction_App_Store', ent: 'ShieldAction.entitlements',
    quelle: 'ShieldAction.swift',
    punkt:  'com.apple.ManagedSettings.shield-action-service',
    klasse: 'ShieldActionExtension' }
].freeze

Dir.mktmpdir('lernzeit-ios-') do |arbeitsordner|
  Dir.chdir(arbeitsordner) do
    FileUtils.mkdir_p('scripts')
    FileUtils.cp(File.join(REPO, 'scripts/ios-add-extensions.rb'), 'scripts/')
    FileUtils.cp_r(File.join(REPO, 'native'), '.')

    profil_dir = File.expand_path('~/Library/MobileDevice/Provisioning Profiles')
    FileUtils.mkdir_p(profil_dir)

    # ---- Fall 1: alle Profile vorhanden ----
    ERWARTET.each_with_index do |e, i|
      File.write(File.join(profil_dir, "p#{i}.mobileprovision"),
                 "<key>Name</key>\n<string>#{e[:profil]}</string>\n")
    end

    baue_testprojekt
    ausgabe = fuehre_aus
    ok(ausgabe.scan('eingehaengt').size == ERWARTET.size,
       "Alle #{ERWARTET.size} Erweiterungen werden eingehaengt")

    project = Xcodeproj::Project.open('ios/App/App.xcodeproj')
    app = project.targets.find { |t| t.name == 'App' }

    ERWARTET.each do |e|
      ext = project.targets.find { |t| t.name == e[:target] }
      ok(!ext.nil?, "#{e[:target]}: Ziel existiert")
      next if ext.nil?

      ok(ext.product_type == 'com.apple.product-type.app-extension',
         "#{e[:target]}: ist eine App-Erweiterung")

      quellen = ext.source_build_phase.files.map { |f| f.file_ref.path }
      ok(quellen.include?(e[:quelle]), "#{e[:target]}: #{e[:quelle]} wird kompiliert")
      ok(quellen.include?('ScreenTimeShared.swift'),
         "#{e[:target]}: gemeinsamer Zustand wird mitkompiliert")

      ext.build_configurations.each do |c|
        b = c.build_settings
        ok(b['PRODUCT_BUNDLE_IDENTIFIER'] == e[:bundle], "#{e[:target]}/#{c.name}: Bundle-ID")
        ok(b['PROVISIONING_PROFILE_SPECIFIER'] == e[:profil], "#{e[:target]}/#{c.name}: Profil")
        ok(b['CODE_SIGN_ENTITLEMENTS'] == "#{e[:target]}/#{e[:ent]}", "#{e[:target]}/#{c.name}: Entitlements")
        ok(b['MARKETING_VERSION'] == '1.2.5', "#{e[:target]}/#{c.name}: Version von der App")
        ok(b['IPHONEOS_DEPLOYMENT_TARGET'] == '16.0', "#{e[:target]}/#{c.name}: iOS 16")
      end

      ok(app.dependencies.any? { |d| d.target&.name == e[:target] },
         "#{e[:target]}: App haengt davon ab")

      plist = File.read("ios/App/#{e[:target]}/Info.plist")
      ok(plist.include?(e[:punkt]), "#{e[:target]}: Erweiterungspunkt #{e[:punkt].split('.').last}")
      ok(plist.include?("$(PRODUCT_MODULE_NAME).#{e[:klasse]}"), "#{e[:target]}: Hauptklasse")

      ent = File.read("ios/App/#{e[:target]}/#{e[:ent]}")
      ok(ent.include?('com.apple.developer.family-controls'), "#{e[:target]}: Family Controls")
      ok(ent.include?('group.de.lernzeit.app'), "#{e[:target]}: App Group")
    end

    embed = app.copy_files_build_phases.select { |ph| ph.symbol_dst_subfolder_spec == :plug_ins }
    ok(embed.size == 1, 'Genau eine Phase "Embed App Extensions"')
    eingebettet = embed.first ? embed.first.files.map(&:display_name) : []
    ERWARTET.each do |e|
      ok(eingebettet.any? { |n| n.include?(e[:target]) },
         "#{e[:target]}: wird in die App eingebettet")
    end

    # Jede Erweiterung braucht eine EIGENE Bundle-ID, sonst weist App Store
    # Connect den Upload ab.
    ids = project.targets.reject { |t| t.name == 'App' }.map do |t|
      t.build_configurations.first.build_settings['PRODUCT_BUNDLE_IDENTIFIER']
    end
    ok(ids.uniq.size == ids.size, 'Alle Bundle-IDs sind verschieden')

    # ---- Fall 2: zweiter Lauf aendert nichts ----
    ausgabe = fuehre_aus
    ok(ausgabe.scan('bereits vorhanden').size == ERWARTET.size,
       'Zweiter Lauf erkennt alle vorhandenen Ziele')
    project = Xcodeproj::Project.open('ios/App/App.xcodeproj')
    app = project.targets.find { |t| t.name == 'App' }
    ok(project.targets.size == ERWARTET.size + 1, 'Keine Ziele verdoppelt')
    ok(app.copy_files_build_phases.count { |ph| ph.symbol_dst_subfolder_spec == :plug_ins } == 1,
       'Keine zweite Embed-Phase')

    # ---- Fall 3: ein Profil fehlt -> nur diese Erweiterung entfaellt ----
    FileUtils.rm_f(File.join(profil_dir, 'p1.mobileprovision'))
    ERWARTET.each { |e| FileUtils.rm_rf("ios/App/#{e[:target]}") }
    baue_testprojekt
    ausgabe = fuehre_aus
    ok(ausgabe.include?('WEGGELASSEN'), 'Fehlendes Profil: Erweiterung wird weggelassen')
    project = Xcodeproj::Project.open('ios/App/App.xcodeproj')
    ok(project.targets.none? { |t| t.name == 'LernZeitShield' },
       'Fehlendes Profil: dieses Ziel fehlt — der Build bleibt gruen')
    ok(project.targets.any? { |t| t.name == 'LernZeitMonitor' },
       'Die uebrigen Erweiterungen kommen trotzdem mit')

    FileUtils.rm_rf(File.expand_path('~/Library/MobileDevice'))
  end
end

puts @fehler.zero? ? "\nAlle Pruefungen bestanden." : "\n#{@fehler} FEHLGESCHLAGEN"
exit(@fehler.zero? ? 0 : 1)

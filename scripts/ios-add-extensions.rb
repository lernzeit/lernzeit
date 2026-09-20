#!/usr/bin/env ruby
# frozen_string_literal: true

# Haengt die App-Erweiterungen fuer die Bildschirmzeit-Sperre in das
# Xcode-Projekt ein.
#
# Warum als Skript und nicht einmal von Hand in Xcode: Der Build wirft das
# ios-Verzeichnis bei jedem Lauf weg ("rm -rf ios" + "npx cap add ios").
# Alles, was dort von Hand eingetragen waere, waere beim naechsten Lauf
# verschwunden.
#
# Ausfuehren NACH dem Entitlements-Patch und VOR "pod install".
# Die Reihenfolge ist nicht beliebig: Der Entitlements-Patch prueft, dass
# CODE_SIGN_ENTITLEMENTS genau zweimal vorkommt (Debug und Release der App).
# Jedes Erweiterungsziel bringt zwei weitere mit und wuerde diese Pruefung
# fehlschlagen lassen.
#
# Das Skript ist idempotent: Ein bereits vorhandenes Ziel wird uebersprungen.
#
# Fehlt ein Provisioning-Profil, wird die betreffende Erweiterung
# UEBERSPRUNGEN statt den Build zu faellen. Ein gruener Build ohne Sperre ist
# besser als ein roter mit.

require 'xcodeproj'
require 'fileutils'

PROJECT_PATH = 'ios/App/App.xcodeproj'
APP_TARGET   = 'App'
TEAM_ID      = '367Y2UUXJG'

# Wird in jedes Erweiterungsziel mit einkompiliert. Eine Quelle der Wahrheit
# fuer Schluessel und Speicherort — zwei Kopien wuerden auseinanderlaufen.
SHARED_SOURCE = 'native/screen-time/ios/Sources/ScreenTimePlugin/ScreenTimeShared.swift'

EXTENSIONS = [
  {
    target:       'LernZeitMonitor',
    bundle_id:    'de.lernzeit.app.monitor',
    profile:      'delernzeitapp_monitor_App_Store',
    source_dir:   'native/screen-time/ios/Extensions/DeviceActivityMonitorExtension',
    entitlements: 'Monitor.entitlements'
  },
  {
    target:       'LernZeitShield',
    bundle_id:    'de.lernzeit.app.shield',
    profile:      'delernzeitapp_shield_App_Store',
    source_dir:   'native/screen-time/ios/Extensions/ShieldConfigurationExtension',
    entitlements: 'Shield.entitlements'
  },
  {
    target:       'LernZeitShieldAction',
    bundle_id:    'de.lernzeit.app.shieldaction',
    profile:      'delernzeitapp_shieldaction_App_Store',
    source_dir:   'native/screen-time/ios/Extensions/ShieldActionExtension',
    entitlements: 'ShieldAction.entitlements'
  }
].freeze

def verfuegbare_profile
  # Codemagic legt die geladenen Profile hier ab. Ist das Verzeichnis leer
  # oder fehlt es (etwa lokal), wird nichts uebersprungen — dann entscheidet
  # der Build selbst.
  dir = File.expand_path('~/Library/MobileDevice/Provisioning Profiles')
  return nil unless Dir.exist?(dir)

  Dir.glob(File.join(dir, '*.mobileprovision')).map do |pfad|
    roh = File.read(pfad, mode: 'rb', encoding: 'BINARY')
    treffer = roh[%r{<key>Name</key>\s*<string>([^<]+)</string>}, 1]
    treffer&.strip
  end.compact
end

profile_namen = verfuegbare_profile
if profile_namen.nil?
  puts 'Kein Profilverzeichnis gefunden — Profilpruefung wird uebersprungen.'
else
  puts "Geladene Profile: #{profile_namen.join(', ')}"
end

project    = Xcodeproj::Project.open(PROJECT_PATH)
app_target = project.targets.find { |t| t.name == APP_TARGET }
abort("FEHLER: Ziel '#{APP_TARGET}' nicht gefunden.") if app_target.nil?

# Version der App uebernehmen, damit die Erweiterung nicht mit einer anderen
# Nummer hochgeladen wird — App Store Connect weist das sonst ab.
app_release = app_target.build_configurations.find { |c| c.name == 'Release' }
marketing   = app_release.build_settings['MARKETING_VERSION'] || '1.0'
build_nr    = app_release.build_settings['CURRENT_PROJECT_VERSION'] || '1'

eingehaengt = []

EXTENSIONS.each do |ext|
  name = ext[:target]

  if project.targets.any? { |t| t.name == name }
    puts "#{name}: bereits vorhanden, uebersprungen."
    next
  end

  if profile_namen && !profile_namen.include?(ext[:profile])
    puts "#{name}: Profil '#{ext[:profile]}' nicht geladen — Erweiterung wird WEGGELASSEN."
    puts '  Der Build laeuft weiter, die Sperre schnappt dann nur beim Oeffnen der App zu.'
    next
  end

  # Quellen neben das Projekt kopieren. Xcode-Pfade bleiben dadurch kurz und
  # relativ zu ios/App, statt mit ../.. aus dem Projekt herauszuzeigen.
  ziel_dir = File.join('ios/App', name)
  FileUtils.mkdir_p(ziel_dir)
  FileUtils.cp_r(Dir.glob(File.join(ext[:source_dir], '*')), ziel_dir)
  FileUtils.cp(SHARED_SOURCE, ziel_dir)

  target = project.new_target(:app_extension, name, :ios, '16.0')

  gruppe = project.main_group.new_group(name, name)
  swift_dateien = Dir.glob(File.join(ziel_dir, '*.swift')).sort
  swift_dateien.each do |pfad|
    ref = gruppe.new_reference(File.basename(pfad))
    target.source_build_phase.add_file_reference(ref)
  end
  gruppe.new_reference('Info.plist')
  gruppe.new_reference(ext[:entitlements])

  target.build_configurations.each do |config|
    s = config.build_settings
    s['PRODUCT_NAME']                    = '$(TARGET_NAME)'
    s['PRODUCT_BUNDLE_IDENTIFIER']       = ext[:bundle_id]
    s['INFOPLIST_FILE']                  = "#{name}/Info.plist"
    s['GENERATE_INFOPLIST_FILE']         = 'NO'
    s['CODE_SIGN_ENTITLEMENTS']          = "#{name}/#{ext[:entitlements]}"
    s['CODE_SIGN_STYLE']                 = 'Manual'
    s['DEVELOPMENT_TEAM']                = TEAM_ID
    s['PROVISIONING_PROFILE_SPECIFIER']  = ext[:profile]
    s['CODE_SIGN_IDENTITY']              = 'Apple Distribution'
    s['IPHONEOS_DEPLOYMENT_TARGET']      = '16.0'
    s['SWIFT_VERSION']                   = '5.0'
    s['TARGETED_DEVICE_FAMILY']          = '1,2'
    s['SKIP_INSTALL']                    = 'YES'
    s['MARKETING_VERSION']               = marketing
    s['CURRENT_PROJECT_VERSION']         = build_nr
    # Erweiterungen duerfen keine eigenen Frameworks einbetten.
    s['ALWAYS_EMBED_SWIFT_STANDARD_LIBRARIES'] = 'NO'
  end

  # In die App einbetten. Ohne diese Phase wird die Erweiterung gebaut, landet
  # aber nicht im Paket — und das faellt erst auf dem Geraet auf.
  embed = app_target.copy_files_build_phases.find do |phase|
    phase.symbol_dst_subfolder_spec == :plug_ins
  end
  if embed.nil?
    embed = app_target.new_copy_files_build_phase('Embed App Extensions')
    embed.symbol_dst_subfolder_spec = :plug_ins
  end
  embed.add_file_reference(target.product_reference, true)
  app_target.add_dependency(target)

  eingehaengt << name
  puts "#{name}: eingehaengt (#{ext[:bundle_id]}, Profil #{ext[:profile]})."
end

project.save

puts '--- Ziele im Projekt ---'
project.targets.each { |t| puts "  #{t.name} (#{t.product_type})" }

if eingehaengt.empty?
  puts 'Keine Erweiterung eingehaengt. Der Build laeuft ohne automatische Ruecksperre.'
else
  puts "Eingehaengt: #{eingehaengt.join(', ')}"
end

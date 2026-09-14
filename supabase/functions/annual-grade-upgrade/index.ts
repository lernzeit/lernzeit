import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0'

Deno.serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // Restrict to service-role bearer (cron only)
    const bearer = req.headers.get('Authorization')?.replace('Bearer ', '')
    if (!supabaseKey || bearer !== supabaseKey) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { headers: { 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Genau ein Lauf je Kalenderjahr.
    //
    // Diese Funktion erhoeht bei jedem Aufruf JEDE Klasse um eins und merkte
    // sich bis September 2026 nicht, dass sie schon gelaufen war. Ein zweiter
    // Aufruf — ein Wiederholungsversuch, ein manuelles Nachholen neben dem
    // cron-Auftrag — setzte jedes Kind zwei Stufen hoch. Auffallen wuerde das
    // erst an zu schweren Aufgaben, und dann waere die Ursache nicht mehr zu
    // erkennen.
    //
    // claim_annual_job belegt das Jahr in einem Rutsch (INSERT ... ON CONFLICT
    // mit Jahresvergleich) und meldet nur dem ersten Aufrufer `true`. Zwischen
    // Nachsehen und Eintragen bleibt damit keine Luecke.
    const jahr = new Date().getFullYear()
    const { data: darfLaufen, error: claimError } = await supabase
      .rpc('claim_annual_job', { p_job_name: 'annual-grade-upgrade', p_year: jahr })

    if (claimError) {
      console.error('❌ Jahresbelegung fehlgeschlagen:', claimError)
      throw claimError
    }

    if (!darfLaufen) {
      console.log(`ℹ️ Klassenwechsel ${jahr} lief bereits — kein zweiter Durchlauf.`)
      return new Response(
        JSON.stringify({
          success: true,
          message: `Klassenwechsel ${jahr} lief bereits`,
          updated: 0,
          skipped: true
        }),
        { headers: { 'Content-Type': 'application/json' } }
      )
    }

    console.log('🎓 Jährlicher Klassenwechsel gestartet...')

    // Hole alle Profile von Kindern (role = 'child')
    const { data: childProfiles, error: fetchError } = await supabase
      .from('profiles')
      .select('id, name, grade, role')
      .eq('role', 'child')
      .not('grade', 'is', null)

    if (fetchError) {
      console.error('❌ Fehler beim Laden der Kinderprofile:', fetchError)
      throw fetchError
    }

    if (!childProfiles || childProfiles.length === 0) {
      console.log('ℹ️ Keine Kinderprofile zum Aktualisieren gefunden')
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Keine Kinderprofile gefunden',
          updated: 0 
        }),
        { headers: { 'Content-Type': 'application/json' } }
      )
    }

    let updatedCount = 0
    const updates = []

    // Durchlaufe alle Kinderprofile und steigere die Klasse
    for (const child of childProfiles) {
      // Kinder in Klasse 12 bleiben in Klasse 12
      if (child.grade >= 12) {
        console.log(`📚 ${child.name} bleibt in Klasse 12`)
        continue
      }

      const newGrade = child.grade + 1
      
      // Aktualisiere die Klasse
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ grade: newGrade })
        .eq('id', child.id)

      if (updateError) {
        console.error(`❌ Fehler beim Aktualisieren von ${child.name}:`, updateError)
        continue
      }

      console.log(`✅ ${child.name}: Klasse ${child.grade} → Klasse ${newGrade}`)
      updatedCount++
      updates.push({
        id: child.id,
        name: child.name,
        oldGrade: child.grade,
        newGrade: newGrade
      })
    }

    console.log(`🎉 Klassenwechsel abgeschlossen! ${updatedCount} Kinder aktualisiert.`)

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `Klassenwechsel erfolgreich abgeschlossen`,
        updated: updatedCount
      }),
      { 
        headers: { 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('❌ Fehler beim jährlichen Klassenwechsel:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: 'Internal error'
      }),
      { 
        headers: { 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})
-- Erweitere die achievement_type ENUM um neue Typen
-- Diese müssen in einer separaten Transaktion committet werden, bevor sie verwendet werden können

DO $$ 
BEGIN
    -- Versuche jeden neuen Typ hinzuzufügen, ignoriere Fehler wenn er bereits existiert
    BEGIN
        ALTER TYPE achievement_type ADD VALUE 'overtime_learning';
    EXCEPTION
        WHEN duplicate_object THEN
            -- Typ existiert bereits, ignoriere
            NULL;
    END;
    
    BEGIN
        ALTER TYPE achievement_type ADD VALUE 'improvement';
    EXCEPTION
        WHEN duplicate_object THEN NULL;
    END;
    
    BEGIN
        ALTER TYPE achievement_type ADD VALUE 'accuracy_master';
    EXCEPTION
        WHEN duplicate_object THEN NULL;
    END;
    
    BEGIN
        ALTER TYPE achievement_type ADD VALUE 'night_owl';
    EXCEPTION
        WHEN duplicate_object THEN NULL;
    END;
    
    BEGIN
        ALTER TYPE achievement_type ADD VALUE 'weekend_warrior';
    EXCEPTION
        WHEN duplicate_object THEN NULL;
    END;
    
    BEGIN
        ALTER TYPE achievement_type ADD VALUE 'marathon_sessions';
    EXCEPTION
        WHEN duplicate_object THEN NULL;
    END;
    
    BEGIN
        ALTER TYPE achievement_type ADD VALUE 'speed_master';
    EXCEPTION
        WHEN duplicate_object THEN NULL;
    END;
    
    BEGIN
        ALTER TYPE achievement_type ADD VALUE 'consistency';
    EXCEPTION
        WHEN duplicate_object THEN NULL;
    END;
    
    BEGIN
        ALTER TYPE achievement_type ADD VALUE 'comeback';
    EXCEPTION
        WHEN duplicate_object THEN NULL;
    END;
    
    BEGIN
        ALTER TYPE achievement_type ADD VALUE 'subject_explorer';
    EXCEPTION
        WHEN duplicate_object THEN NULL;
    END;
    
    BEGIN
        ALTER TYPE achievement_type ADD VALUE 'midnight_scholar';
    EXCEPTION
        WHEN duplicate_object THEN NULL;
    END;
    
    BEGIN
        ALTER TYPE achievement_type ADD VALUE 'perfect_week';
    EXCEPTION
        WHEN duplicate_object THEN NULL;
    END;
    
    BEGIN
        ALTER TYPE achievement_type ADD VALUE 'time_traveler';
    EXCEPTION
        WHEN duplicate_object THEN NULL;
    END;
    
    BEGIN
        ALTER TYPE achievement_type ADD VALUE 'knowledge_thirst';
    EXCEPTION
        WHEN duplicate_object THEN NULL;
    END;
    
    BEGIN
        ALTER TYPE achievement_type ADD VALUE 'supernova';
    EXCEPTION
        WHEN duplicate_object THEN NULL;
    END;
END $$;
package de.lernzeit.app;

import android.os.Bundle;
import android.view.View;

import androidx.activity.EdgeToEdge;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Aktiviert Edge-to-Edge kompatibel für alle Android-Versionen (inkl. 15+).
        // Ersetzt die von Android 15 als deprecated markierten
        // Window.setStatusBarColor / Window.setNavigationBarColor Aufrufe.
        EdgeToEdge.enable(this);
        super.onCreate(savedInstanceState);

        // WebView-Root Padding an Systemleisten anpassen, damit Content nicht
        // hinter Status-/Navigationsleiste rutscht.
        final View root = findViewById(android.R.id.content);
        if (root != null) {
            ViewCompat.setOnApplyWindowInsetsListener(root, (v, insets) -> {
                Insets bars = insets.getInsets(
                        WindowInsetsCompat.Type.systemBars()
                                | WindowInsetsCompat.Type.displayCutout());
                v.setPadding(bars.left, bars.top, bars.right, bars.bottom);
                return WindowInsetsCompat.CONSUMED;
            });
        }
    }
}

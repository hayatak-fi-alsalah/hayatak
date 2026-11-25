package com.hayatak.salah;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(SettingsOpener.class);
        super.onCreate(savedInstanceState);
    }
}

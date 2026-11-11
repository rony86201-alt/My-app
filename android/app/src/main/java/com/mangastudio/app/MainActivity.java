package com.mangastudio.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(StableDiffusionPlugin.class);
        super.onCreate(savedInstanceState);
    }
}

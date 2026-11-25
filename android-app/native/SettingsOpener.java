package com.hayatak.salah;

import android.content.ComponentName;
import android.content.Intent;
import android.net.Uri;
import android.provider.Settings;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "SettingsOpener")
public class SettingsOpener extends Plugin {
    private boolean tryStart(Intent i) {
        try {
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(i);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    private void appDetails() {
        Intent i = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:" + getContext().getPackageName()));
        tryStart(i);
    }

    @PluginMethod
    public void isIgnoring(PluginCall call) {
        boolean v = false;
        try {
            android.os.PowerManager pm = (android.os.PowerManager) getContext().getSystemService(android.content.Context.POWER_SERVICE);
            v = pm.isIgnoringBatteryOptimizations(getContext().getPackageName());
        } catch (Exception e) {}
        JSObject r = new JSObject();
        r.put("value", v);
        call.resolve(r);
    }

    @PluginMethod
    public void open(PluginCall call) {
        String kind = call.getString("kind", "app");
        boolean ok = false;
        if ("ignore".equals(kind)) {
            Intent i = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS, Uri.parse("package:" + getContext().getPackageName()));
            ok = tryStart(i);
            if (!ok) ok = tryStart(new Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS));
        } else if ("battery".equals(kind)) {
            ok = tryStart(new Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS));
        } else if ("auto".equals(kind)) {
            String[][] comps = {
                {"com.coloros.safecenter", "com.coloros.safecenter.startupapp.StartupAppListActivity"},
                {"com.oplus.battery", "com.oplus.startupapp.StartupAppListActivity"},
                {"com.coloros.safecenter", "com.coloros.safecenter.permission.startup.StartupAppListActivity"},
                {"com.oppo.safe", "com.oppo.safe.permission.startup.StartupAppListActivity"},
                {"com.miui.securitycenter", "com.miui.permcenter.autostart.AutoStartManagementActivity"},
                {"com.huawei.systemmanager", "com.huawei.systemmanager.startupmgr.ui.StartupNormalAppListActivity"},
                {"com.samsung.android.lool", "com.samsung.android.sm.ui.battery.BatteryActivity"}
            };
            for (String[] c : comps) {
                Intent i = new Intent();
                i.setComponent(new ComponentName(c[0], c[1]));
                if (tryStart(i)) { ok = true; break; }
            }
            if (!ok) { appDetails(); ok = true; }
        } else {
            appDetails();
            ok = true;
        }
        JSObject r = new JSObject();
        r.put("ok", ok);
        call.resolve(r);
    }
}

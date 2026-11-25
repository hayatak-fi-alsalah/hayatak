package com.hayatak.salah;

import android.app.AlarmManager;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.ComponentName;
import android.content.Context;
import android.content.SharedPreferences;
import org.json.JSONArray;
import org.json.JSONObject;
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


    static void rescheduleFromPrefs(Context c) {
        try { doSchedule(c, c.getSharedPreferences("hq", Context.MODE_PRIVATE).getString("alarms", "[]"), false); } catch (Exception e) {}
    }

    static int doSchedule(Context c, String json, boolean save) throws Exception {
        SharedPreferences sp = c.getSharedPreferences("hq", Context.MODE_PRIVATE);
        AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
        String old = sp.getString("alarm_ids", "");
        if (!old.isEmpty()) for (String x : old.split(",")) { try { am.cancel(pi(c, Integer.parseInt(x), null, null, null, false)); } catch (Exception e) {} }
        JSONArray a = new JSONArray(json); long now = System.currentTimeMillis(); StringBuilder ids = new StringBuilder(); int n = 0; long first = 0;
        Intent show = c.getPackageManager().getLaunchIntentForPackage(c.getPackageName());
        PendingIntent sh = PendingIntent.getActivity(c, 1, show, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
        for (int i = 0; i < a.length() && n < 120; i++) {
            JSONObject o = a.getJSONObject(i); long at = o.getLong("at"); if (at <= now + 1000) continue;
            int id = o.getInt("id");
            am.setAlarmClock(new AlarmManager.AlarmClockInfo(at, sh), pi(c, id, o.optString("title"), o.optString("body"), o.optString("ch"), true));
            if (ids.length() > 0) ids.append(','); ids.append(id); n++; if (first == 0 || at < first) first = at;
        }
        SharedPreferences.Editor e = sp.edit().putString("alarm_ids", ids.toString()).putInt("alarm_n", n).putLong("alarm_first", first);
        if (save) e.putString("alarms", json);
        e.apply();
        return n;
    }

    static PendingIntent pi(Context c, int id, String t, String b, String ch, boolean create) {
        Intent i = new Intent(c, AlarmReceiver.class); i.setAction("com.hayatak.ALARM"); i.setData(android.net.Uri.parse("hq://alarm/" + id));
        if (create) { i.putExtra("id", id).putExtra("title", t).putExtra("body", b).putExtra("ch", ch); }
        return PendingIntent.getBroadcast(c, id, i, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
    }

    @PluginMethod
    public void schedule(PluginCall call) {
        try { int n = doSchedule(getContext(), call.getString("items", "[]"), true); JSObject r = new JSObject(); r.put("n", n); call.resolve(r); }
        catch (Exception e) { call.reject(String.valueOf(e.getMessage())); }
    }

    @PluginMethod
    public void testAlarm(PluginCall call) {
        try {
            Context c = getContext(); AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
            long at = System.currentTimeMillis() + 10000;
            Intent show = c.getPackageManager().getLaunchIntentForPackage(c.getPackageName());
            PendingIntent sh = PendingIntent.getActivity(c, 1, show, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
            am.setAlarmClock(new AlarmManager.AlarmClockInfo(at, sh), pi(c, 777002, "حياتك في الصلاة", "تجربة التنبيه نجحت ✓", call.getString("ch", "adhan_aaqib"), true));
            call.resolve();
        } catch (Exception e) { call.reject(String.valueOf(e.getMessage())); }
    }

    @PluginMethod
    public void diag(PluginCall call) {
        JSObject r = new JSObject(); Context c = getContext();
        try {
            SharedPreferences sp = c.getSharedPreferences("hq", Context.MODE_PRIVATE);
            NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
            AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
            r.put("sdk", android.os.Build.VERSION.SDK_INT); r.put("brand", android.os.Build.MANUFACTURER + " " + android.os.Build.MODEL);
            r.put("notif", nm.areNotificationsEnabled());
            r.put("exact", android.os.Build.VERSION.SDK_INT >= 31 ? am.canScheduleExactAlarms() : true);
            android.os.PowerManager pm = (android.os.PowerManager) c.getSystemService(Context.POWER_SERVICE);
            r.put("battery", pm.isIgnoringBatteryOptimizations(c.getPackageName()));
            r.put("dnd", android.os.Build.VERSION.SDK_INT >= 23 ? nm.getCurrentInterruptionFilter() : 1);
            r.put("last", sp.getLong("lastFired", 0)); r.put("fired", sp.getInt("firedCount", 0));
            r.put("n", sp.getInt("alarm_n", 0)); r.put("first", sp.getLong("alarm_first", 0));
            r.put("svc", sp.getLong("svcAlive", 0));
            if (android.os.Build.VERSION.SDK_INT >= 26) {
                String[] ids = {"adhan_aaqib", "pre_nasheed", "reminder"}; JSONObject ch = new JSONObject();
                for (String id : ids) { NotificationChannel x = nm.getNotificationChannel(id); ch.put(id, x == null ? -1 : x.getImportance()); }
                NotificationChannel ps = nm.getNotificationChannel("persist_next"); ch.put("persist", ps == null ? -1 : ps.getImportance());
                r.put("ch", ch.toString());
            }
        } catch (Exception e) { r.put("err", String.valueOf(e.getMessage())); }
        call.resolve(r);
    }

    @PluginMethod
    public void persist(PluginCall call) {
        try {
            android.content.Context c = getContext();
            Intent i = new Intent(c, HayatakService.class);
            c.getSharedPreferences("hq", Context.MODE_PRIVATE).edit().putBoolean("persist", Boolean.TRUE.equals(call.getBoolean("on", true))).apply();
            if (Boolean.TRUE.equals(call.getBoolean("on", true))) {
                i.putExtra("items", call.getString("items", "[]"));
                if (android.os.Build.VERSION.SDK_INT >= 26) c.startForegroundService(i); else c.startService(i);
            } else { c.stopService(i); }
            call.resolve();
        } catch (Exception e) { call.reject(String.valueOf(e.getMessage())); }
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

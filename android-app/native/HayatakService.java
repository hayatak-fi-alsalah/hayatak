package com.hayatak.salah;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.ServiceInfo;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import org.json.JSONArray;

public class HayatakService extends Service {
    static final String CH = "persist_next";
    private final Handler h = new Handler(Looper.getMainLooper());
    private final Runnable tick = new Runnable() { public void run() { update(); } };

    @Override public IBinder onBind(Intent i) { return null; }

    @Override public int onStartCommand(Intent intent, int flags, int startId) {
        SharedPreferences sp = getSharedPreferences("hq", MODE_PRIVATE);
        if (intent != null && intent.hasExtra("items")) sp.edit().putString("items", intent.getStringExtra("items")).apply();
        update();
        return START_STICKY;
    }

    private void update() {
        h.removeCallbacks(tick);
        String name = "الصلاة القادمة", clock = ""; long when = 0, nextT = 0;
        try {
            JSONArray a = new JSONArray(getSharedPreferences("hq", MODE_PRIVATE).getString("items", "[]"));
            long now = System.currentTimeMillis();
            for (int i = 0; i < a.length(); i++) {
                JSONArray r = a.getJSONArray(i);
                long t = r.getLong(1);
                if (t > now) { name = r.getString(0); clock = r.getString(2); when = t; break; }
            }
        } catch (Exception e) {}
        NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (Build.VERSION.SDK_INT >= 26) {
            NotificationChannel c = new NotificationChannel(CH, "الصلاة القادمة (دائم)", NotificationManager.IMPORTANCE_LOW);
            c.setShowBadge(false); c.setSound(null, null); nm.createNotificationChannel(c);
        }
        Intent open = getPackageManager().getLaunchIntentForPackage(getPackageName());
        PendingIntent pi = PendingIntent.getActivity(this, 0, open, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
        Notification.Builder b = Build.VERSION.SDK_INT >= 26 ? new Notification.Builder(this, CH) : new Notification.Builder(this);
        int ic = getResources().getIdentifier("ic_stat_hayatak", "drawable", getPackageName());
        b.setSmallIcon(ic != 0 ? ic : android.R.drawable.ic_lock_idle_alarm).setContentTitle("صلاة " + name + (clock.isEmpty() ? "" : " · " + clock)).setContentText("حياتك في الصلاة").setOngoing(true).setContentIntent(pi).setOnlyAlertOnce(true).setCategory(Notification.CATEGORY_SERVICE);
        if (when > 0 && Build.VERSION.SDK_INT >= 24) { b.setWhen(when).setShowWhen(true).setUsesChronometer(true); if (Build.VERSION.SDK_INT >= 29) b.setChronometerCountDown(true); }
        Notification n = b.build();
        try {
            if (Build.VERSION.SDK_INT >= 34) startForeground(7001, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE);
            else startForeground(7001, n);
        } catch (Exception e) { stopSelf(); return; }
        long delay = when > 0 ? Math.max(5000, when - System.currentTimeMillis() + 1500) : 3600000L;
        h.postDelayed(tick, Math.min(delay, 3600000L));
    }

    @Override public void onDestroy() { h.removeCallbacks(tick); super.onDestroy(); }
}

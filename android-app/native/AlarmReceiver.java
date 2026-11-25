package com.hayatak.salah;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;

public class AlarmReceiver extends BroadcastReceiver {
    @Override public void onReceive(Context c, Intent in) {
        try {
            String act = in.getAction();
            if (Intent.ACTION_BOOT_COMPLETED.equals(act) || Intent.ACTION_MY_PACKAGE_REPLACED.equals(act)) {
                SettingsOpener.rescheduleFromPrefs(c);
                try {
                    Intent s = new Intent(c, HayatakService.class);
                    if (c.getSharedPreferences("hq", Context.MODE_PRIVATE).getBoolean("persist", true)) {
                        if (Build.VERSION.SDK_INT >= 26) c.startForegroundService(s); else c.startService(s);
                    }
                } catch (Exception e) {}
                return;
            }
            int id = in.getIntExtra("id", 1);
            String title = in.getStringExtra("title"), body = in.getStringExtra("body"), ch = in.getStringExtra("ch");
            if (ch == null) ch = "reminder";
            NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
            if (Build.VERSION.SDK_INT >= 26 && nm.getNotificationChannel(ch) == null) {
                nm.createNotificationChannel(new NotificationChannel(ch, "تنبيهات حياتك في الصلاة", NotificationManager.IMPORTANCE_HIGH));
            }
            Intent open = c.getPackageManager().getLaunchIntentForPackage(c.getPackageName());
            PendingIntent pi = PendingIntent.getActivity(c, 0, open, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
            Notification.Builder b = Build.VERSION.SDK_INT >= 26 ? new Notification.Builder(c, ch) : new Notification.Builder(c);
            int ic = c.getResources().getIdentifier("ic_stat_hayatak", "drawable", c.getPackageName());
            b.setSmallIcon(ic != 0 ? ic : android.R.drawable.ic_lock_idle_alarm).setContentTitle(title == null ? "حياتك في الصلاة" : title).setContentText(body == null ? "" : body)
             .setStyle(new Notification.BigTextStyle().bigText(body == null ? "" : body)).setAutoCancel(true).setContentIntent(pi).setCategory(Notification.CATEGORY_ALARM).setWhen(System.currentTimeMillis());
            if (Build.VERSION.SDK_INT < 26) b.setPriority(Notification.PRIORITY_HIGH).setDefaults(Notification.DEFAULT_ALL);
            nm.notify(id, b.build());
            SharedPreferences sp = c.getSharedPreferences("hq", Context.MODE_PRIVATE);
            sp.edit().putLong("lastFired", System.currentTimeMillis()).putString("lastTitle", String.valueOf(body)).putInt("firedCount", sp.getInt("firedCount", 0) + 1).apply();
        } catch (Exception e) {}
    }
}

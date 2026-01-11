<?php
require __DIR__ . '/vendor/autoload.php';
require __DIR__ . '/src/Vmaya/engine.php';

use \Telegram\Bot\Api;

$lock = new ProcessLock(__DIR__ . '/bot.pid');

if (!$lock->acquire()) {
    exit(0);
}

// Регистрируем обработчики для корректного завершения
if (function_exists('pcntl_signal')) {
    GLOBAL $lock;
    pcntl_signal(SIGTERM, function() use ($lock) { exit(0); });
    pcntl_signal(SIGINT, function() use ($lock) { exit(0); });
}

register_shutdown_function(function() use ($lock) {
    GLOBAL $lock;
    $lock->release();
});

$telegram = new Api(BOTTOKEN);

$dbp = new mySQLProvider('localhost', _dbname_default, _dbuser, _dbpassword);
$bot = new WeatherBot($telegram, $dbp);

// 1. Удаляем вебхук, если он был установлен
$telegram->deleteWebhook(['drop_pending_updates' => true]);


//trace("Текущий промт:\n".html::RenderFile(TEMPLATES_PATH.'observer_promt2.php'));

// 3. Основной цикл бота
while ($lock->isFile()) {

    $bot->GetUpdates();

    // Проверяем, не нужно ли завершить работу
    if (function_exists('pcntl_signal_dispatch')) {
        pcntl_signal_dispatch();
    }
}

$dbp->Close();
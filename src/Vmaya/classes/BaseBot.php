<?
abstract class BaseBot {
    private $session;
    private $lastUpdateId;
    private $user;
    private $reply_to_message;

    protected $api;
    protected $dbp;
    protected $currentUpdate = null;

    public function getUser() { return $this->user; }
    public function getReplyToMessage() { return $this->reply_to_message; }

	function __construct($api, $dbp) {
        $this->api = $api;
        $this->lastUpdateId = 0;
    }

    public static function getUserLink($userId, $userName) {
        $escapedName = str_replace(['_', '*'], ['\\_', '\\*'], $userName);
        return "[{$escapedName}](tg://user?id={$userId})";
    }

    private function _callbackProcess() {

        $callback = $this->currentUpdate['callback_query'];
        $chatId = $callback['message']['chat']['id'];
        $messageId = $callback['message']['message_id'];
        $data = $callback['data']; // Здесь содержится ваш callback_data
        
        // 1. Ответим на callback (убирает "часики" у кнопки)
        $this->api->answerCallbackQuery([
            'callback_query_id' => $callback['id'],
            'text' => 'Обрабатываю ваш выбор...'
        ]);

        $this->callbackProcess($callback, $chatId, $messageId, $data);
    }

    protected abstract function callbackProcess($callback, $chatId, $messageId, $data);
    protected abstract function commandProcess($command, $chatId, $messageId, $text);
    protected abstract function replyToMessage($reply, $chatId, $messageId, $text);
    protected abstract function messageProcess($chatId, $messageId, $data);

    protected function setSession($name, $value) {
        $this->session[$name] = $value;
        saveSession($this->currentUpdate->getMessage()->getChat()->getId(), $this->session);
    }

    protected function hasSession($name) {
        return isset($this->session[$name]);
    }

    protected function getSession($name) {
        return $this->hasSession($name) ? $this->session[$name] : false;
    }

    protected function popSession($name) {

        if (isset($this->session[$name])) {
            $result = $this->session[$name];
            $this->session[$name] = null;
            saveSession($this->currentUpdate->getMessage()->getChat()->getId(), $this->session);
        } else $result = null;

        return $result;
    }

    public function DeleteMessage($chatId, $message_id) {
        $this->api->deleteMessage([ 'chat_id' => $chatId, 'message_id' => $message_id]); 
    }

    public function PrivateAnswerAndDelete($user_id, $chatId, $private_text, $temporary_text, $wait_sec = 6) {
        $this->Answer($user_id, $private_text);

        if ($user_id != $chatId)
            $this->AnswerAndDelete($chatId, $temporary_text."\n(Перейти в [личные сообщения](https://t.me/".BOTALIASE."))", $wait_sec);
    }

    public function AnswerAndDelete($chatId, $text, $wait_sec = 6) {
        $msg = $this->Answer($chatId, $text."\n(Закроется через $wait_sec сек.)");
        if (isset($msg["message_id"])) {
            sleep($wait_sec);
            $this->DeleteMessage($chatId, $msg["message_id"]);
        }
    }

    public function Answer($chatId, $msg, $messageId = false, $reply_to_message_id = false, $parse_mode = 'Markdown') {

        $params = array_merge([
            'chat_id' => $chatId,
            'text' => $msg,
            'parse_mode' => $parse_mode
        ], is_string($msg) ? ['text' => $msg] : $msg);

        if ($messageId) {

            $params['message_id'] = $messageId;

            return $this->api->editMessageText([
                'chat_id' => $chatId,
                'message_id' => $messageId,
                'text' => $msg,
                'parse_mode' => $parse_mode
            ]);
        } else {

            $message = $this->currentUpdate->getMessage();

            if ($reply_to_message_id)
                $params['reply_to_message_id'] = $reply_to_message_id;
            else if (isset($message['message_thread_id'])) {

                if ($this->reply_to_message && ($this->reply_to_message['message_id'] == $message['message_thread_id']))
                     $params['reply_to_message_id'] = $message['message_thread_id'];
                else $params['message_thread_id'] = $message['message_thread_id'];
            }

            return $this->api->sendMessage($params);
        }
    }

    /*
    protected function getReplyToMessage() {
        $message = $this->currentUpdate->getMessage();
    }*/

    protected function initUser($update) {
        $this->user = isset($update['message']) ? $update['message']['from'] : 
                        (isset($update['callback_query']) ? $update['callback_query']['from'] : null);
        (new TGUserModel())->checkAndAdd($this->user);
    }

    public function GetWebhookUpdates() {
        $update = $this->api->getWebhookUpdate();

        $this->initUser($update);

        if ($this->lastUpdateId != $update->getUpdateId()) {
            $this->runUpdate($update);
            $this->lastUpdateId = $update->getUpdateId();
        }
    }

    public function GetUpdates() {

        try {
            // 4. Получаем обновления с учетом последнего обработанного ID
            $updates = $this->api->getUpdates([
                'offset' => $this->lastUpdateId + 1,
                'timeout' => 30, // Длительность ожидания новых сообщений (сек)
            ]);

            // 5. Обрабатываем каждое обновление
            foreach ($updates as $update) {
                
                
                $this->initUser($update);

                // 6. Обновляем ID последнего обработанного сообщения
                $this->lastUpdateId = $update->getUpdateId();
                $this->runUpdate($update);
        
            } 
        } catch (Exception $e) {
            // 9. Обработка ошибок
            echo 'Ошибка: ' . $e->getMessage() . PHP_EOL;
            sleep(5); // Пауза перед повторной попыткой
        }
    }

    protected function runUpdate($update) {

        $this->currentUpdate = $update;
        $this->session = getSession($update->getMessage()->getChat()->getId());

        $message = $update->getMessage();
        $chatId = $message->getChat()->getId();
        $messageId = $message['message_id'];
        $text = $message->getText();

        trace($update);

        $this->reply_to_message = isset($message['reply_to_message']) ? $message['reply_to_message'] : null;

        if ($text[0] == '/') {
            $ctext = explode('@', $text);
            if (!isset($ctext[1]) || ($ctext[1] == BOTALIASE))
                $this->commandProcess($ctext[0], $chatId, $messageId, $text);
        }
        else if (isset($update['callback_query'])) 
            $this->_callbackProcess();
        else if ($this->reply_to_message)
            $this->replyToMessage($this->reply_to_message, $chatId, $messageId, $text);
        else $this->messageProcess($chatId, $messageId, $text);
    }

    protected function MLQuery($message, $start_promt="Отвечай на русском языке. Коротко.", $session_id=false)
    {
        $history = $session_id ? $this->getSession($session_id) : false;

        if (!$history)
            $history = [
                ['role'=>'system', 'content'=>'Ты - полезный AI-ассистент. Отвечай на русском языке.'],
                ['role'=>'user', 'content'=>$start_promt]
            ];

        $history[] = ['role'=>'user', 'content'=>$message];
        
        $context = stream_context_create([
            'http' => [
                'header'  => "Content-Type: application/json\r\n",
                'method'  => 'POST',
                'content' => json_encode(['messages' => $history]),
                'timeout' => 1800
            ]
        ]);
        
        $result = false;
        try {
            if (($result = file_get_contents(MLSERVER, false, $context)) === FALSE)
                return false;
            else $result = json_decode($result, true);

            if ($session_id && isset($result['response'])) {
                $history[] = ['role'=>'assistant', 'content'=>$result['response']]; // Сохраняем историю
                $this->setSession($session_id, $history);
            }
            
        } catch (Exception $e) {
            trace_error($e->getMessage());
        }
        
        return $result;
    }
}
?>
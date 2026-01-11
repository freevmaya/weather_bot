<?

/*

/forecast_togroup - Разместить прогноз в группе
/weather - Получить прогноз в личку
/who_where - Кто куда собирается

*/

class WeatherBot extends BaseBot {

    protected $GOIN_DESC = "Ответьте на это сообщение через запятую, место, время и продолжительность (дни, необязательно).\nНапример так: Аушкуль, 10.05.2025 10:00, 2";
    protected $NOTIFY_DESC = "Ответьте на это сообщение через запятую, место, время и продолжительность (дни, необязательно).\nНапример так: Аушкуль, 10.05.2025 10:00, 2";

    protected $SOMEWRONG = "Извините, но что то пошло не так. Попробуйте позже, или сообщите разработчику fwadim@mail.ru";
    protected $BESTFORECAST = "*Места где в ближайшее время прогнозируется летная погода*";


    protected function callbackProcess($callback, $chatId, $messageId, $data) {

        $user_id = $this->getUser()['id'];
        switch ($data) {
            case 'show':
                $this->PrivateAnswerAndDelete($user_id, $chatId, (new TSchedule())->ListMessage(), "Ответил вам в личку");
                break;
            case 'going':
                $this->setSession("expect", 'who-where-answer');
                $this->PrivateAnswerAndDelete($user_id, $chatId, $this->GOIN_DESC, "Ответил вам в личку");
                break;
            case 'notify':
                $this->setSession("expect", 'who-where-answer');
                $this->PrivateAnswerAndDelete($user_id, $chatId, $this->NOTIFY_DESC, "Ответил вам в личку");
                break;
            case 'forecast':
                $this->PrivateAnswerAndDelete($user_id, $chatId, 
                        (new ForecastModel())->ForecastListMessage($chatId, "f.time > NOW()", $this->BESTFORECAST), 
                        "Отправил прогноз");
                break;
            case 'history':
                $history = (new ForecastModel())->ForecastListMessage($chatId, 
                    "(f.time >= DATE_SUB(NOW(), INTERVAL 30 DAY) AND f.time < NOW())",
                    "*История прогноза погоды*");
                $this->PrivateAnswerAndDelete($user_id, $chatId, $history, "Отправил историю за 30 дней вам");
                break;
            case 'subscribe_forecast':
                $subscribe = new SubscriberWeather();
                $values = ['user_id'=>$user_id];

                if (count($subscribe->getItems($values)) > 0)
                    $this->AnswerAndDelete($chatId, "Вы уже подписаны");
                else if ($subscribe->Update($values)) {
                    $this->PrivateAnswerAndDelete($user_id, $chatId, "Вы подписались на получения прогноза погоды.", "Отправил уведомление о подписке");
                } else $this->AnswerAndDelete($chatId, $this->SOMEWRONG);
                break;
            default: return;
        }

        $this->DeleteMessage($chatId, $messageId);
    }

    /*
        Доступные команды
weather - Прогноз погоды
who_where - Кто куда собирается
find - поиск сообщения по критериям
    */
    protected function commandProcess($command, $chatId, $messageId, $text) {
        switch ($command) {
            case '/weather':
                $this->DeleteMessage($chatId, $messageId);
                $this->weather($chatId);
                break;
            case '/who_where':
                $this->DeleteMessage($chatId, $messageId);
                $this->who_whereCommand($chatId);
                break;
            case '/find':
                $this->DeleteMessage($chatId, $messageId);
                $this->findMenu($chatId);
                break;
        }
    }

    protected function findMenu($chatId) {

        //$webappInfo = new WebAppInfo(['url' => WEBAPPURL]);
        $keyboard = [
            [
                ['text' => 'По критериям', 'web_app' => ['url' => WEBAPPURL.'?page=find']],
                ['text' => 'Все за 1 час', 'callback_data' => 'afterHour']
            ], [
                ['text' => 'Подписаться', 'callback_data' => 'subscribe_message']
            ]
        ];

        $this->Answer($chatId, ['text' => "Поиск сообщения", 'reply_markup'=> json_encode([
            'inline_keyboard' => $keyboard
        ])]);
    }

    protected function weather($chatId) {
        $keyboard = [
            [
                ['text' => 'Прогноз', 'callback_data' => 'forecast'],
                ['text' => 'История', 'callback_data' => 'history']
            ], [
                ['text' => 'Подписаться', 'callback_data' => 'subscribe_forecast']
            ]
        ];

        $this->Answer($chatId, ['text' => "Сервис прогнозирования летной погоды", 'reply_markup'=> json_encode([
            'inline_keyboard' => $keyboard
        ])]);
    }

    protected function who_whereCommand($chatId) {
        if (count((new TSchedule())->getItems(['state'=>'active'])) > 0)
           $keyboard = [
                [
                    ['text' => 'Посмотреть', 'callback_data' => 'show'],
                    ['text' => 'Я собираюсь в...', 'callback_data' => 'going']
                ], [
                    ['text' => 'Присоединяйтесь, я уже в...', 'callback_data' => 'notify']
                ]
            ];
        else $keyboard = [
                [
                    ['text' => 'Я собираюсь в...', 'callback_data' => 'going'],
                    ['text' => 'Присоединяйтесь, я уже в...', 'callback_data' => 'notify']
                ]
            ];

        $this->Answer($chatId, ['text' => "Кто, где, куда?", 'reply_markup'=> json_encode([
            'inline_keyboard' => $keyboard
        ])]);
    }

    protected function replyToMessage($reply, $chatId, $messageId, $text) {

        if (MLSERVER && ($reply['from']['username'] == BOTALIASE)) {
            $this->mlDialog($chatId, $messageId, $text);
        } else $this->messageProcess($chatId, $messageId, $text);
    }


    protected function messageProcess($chatId, $messageId, $text) {

        $waitState = $this->popSession("expect");

        if ($waitState == 'who-where-answer') 
            $this->whoWhereAnswer($chatId, $text);
        else if (MLSERVER) {
            $this->mlProcess($chatId, $messageId, $text);
        }
    }

    protected function mlText($response) {
        return @$response['choices']['message'];
    }

    protected function mlDialog($chatId, $messageId, $text) {
        $user_id = $this->getUser()['id'];
        $observer_chat_id = 'observer_chat';

        $result = $this->MLQuery($text, "Отвечай на русском языке. Коротко.", $observer_chat_id);
        $text = $this->mlText($result);

        if ($text)
            $this->Answer($chatId, $text, false, $messageId);
    }

    protected function mlProcess($chatId, $messageId, $text) {

        $user_id = $this->getUser()['id'];
        $promt = html::RenderFile(TEMPLATES_PATH.'observer_promt2.php');

        $result = $this->MLQuery("Это текст для класификации: ".$text, $promt);

        trace($result);
        $response = $this->mlText($result);

        if ($response) {

            $types = new MTypes();
            $mcats = new MCats();
            $props = new MProperties();
            $propValues = new MPropValues();
            $unknownProp = new MUnknownProp();
            $messages = new MMessages();

            $s = strpos($response, '{');
            $e = strpos($response, '}', -1);

            $response = substr($response, $s, $e - $s + 1);
            try {
                $data = is_string($response) ? json_decode($response) : $response;

                if (is_object($data)) {

                    if ($data->{'Субъект обращения'} == BOTNAME) {
                        $this->mlDialog($chatId, $messageId, $text);
                        return;
                    }

                    foreach ($data as $key=>$value) 
                        if (is_value($value)) {
                            $typeItems = $types->getItems(['name'=>$key]);
                            if (count($typeItems) == 0) {
                                if ($prop = $props->getItemByName($key)) {
                                    $propValues->Update(['property_id'=>$prop['id'], 'message_id'=>$messageId, 'chat_id'=>$chatId, 'value'=>$value]);
                                } else if (!$mcats->checkAndAdd($chatId, $messageId, $key, $value))
                                    $unknownProp->Update(['name'=>$key, 'value'=>$value]);
                            }
                        }

                    $messages->Update(['message_id'=>$messageId, 'chat_id'=>$chatId, 'user_id'=>$user_id, 'text'=>$text]);
                }
                else print_r($response);


            } catch (Exception $e) {
                trace_log($e);
            }
            
            if (DEV) $this->Answer($chatId, $response);
        }
    }

    protected function whoWhereAnswer($chatId, $text, $replyMessageId = false) {
        $message = $this->currentUpdate->getMessage();

        $userId = $this->currentUpdate->getMessage()->getFrom()->getId();
        $result = (new TSchedule())->checkAndAdd($userId, $text);

        if (is_string($result)) {
            $this->Answer($chatId, $result, false, $replyMessageId);
            $this->who_whereCommand($chatId);
        } else if ($result) 
            $this->Answer($chatId, "Добавлено", false, $replyMessageId);
        else $this->Answer($chatId, $this->SOMEWRONG, false, $replyMessageId);
    }
}
?>
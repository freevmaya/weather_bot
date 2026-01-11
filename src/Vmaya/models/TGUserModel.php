<?
class TGUserModel extends BaseModel {
	
	protected function getTable() {
		return 'tg_users';
	}

	public function getItem($user_id) {
		GLOBAL $dbp;

		if ($user_id) {
			$query = "SELECT * FROM {$this->getTable()} u WHERE u.id = {$user_id}";
			return $dbp->line($query);
		}

		return null;
	}

	public static function getName($user) {

		$fullUserName = implode(" ", [$user['first_name'], $user['last_name']]);
		return $fullUserName ? $fullUserName : $user['username'];
	}

	public function checkAndAdd($record) {
		GLOBAL $dbp;

		if ($record && isset($record['id'])) {
			if (!$this->getItem($record['id'])) {

				$username = toUTF($record['username']);
				$first_name = toUTF($record['first_name']);
				$last_name = toUTF($record['last_name']);

				$query = "INSERT INTO {$this->getTable()} (`id`, `username`, `first_name`, `last_name`, `language_code`) VALUES ({$record['id']}, '{$username}', '{$first_name}', '{$last_name}', '{$record['language_code']}')";
				return $dbp->query($query);
			}
		}

		return false;
	}
}
?>
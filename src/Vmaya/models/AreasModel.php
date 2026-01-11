<?
class AreasModel extends BaseModel {
	
	protected function getTable() {
		return 'areas';
	}

	public function getItem($id) {
		GLOBAL $dbp;

		if ($user_id) {
			$query = "SELECT * FROM {$this->getTable()} a WHERE a.id = {$id}";
			return $dbp->line($query);
		}

		return null;
	}

	public function ByLanguage($lang) {
		if ($lang) {
			$result = $dbp->line("SELECT * FROM {$this->getTable()} WHERE {$lang} IN `languages`");
			if (count($result) == 0)
				$result = $dbp->line("SELECT * FROM {$this->getTable()} WHERE `isDefault` == 1");
		}

		return $result;
	}
}
?>
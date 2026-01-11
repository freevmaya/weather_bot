<?
	error_reporting(E_ALL);
	session_start();
	include("config/engine.php");
	Page::Run(array_merge($_POST, $_GET));
?>
$(window).ready(()=>{

	function passForm(idx, elem) {
		let form = $(elem);
		let submit = form.find('input[type="submit"]');
		let dataModel = form.data('model');
		let itemId = form.find('input[name="id"]').val();
		let blockSubmit = false;
		let ajaxMode = isNumeric(itemId);

		if (ajaxMode) {
			function getValue(input) {
				if (input[0].type == 'checkbox')
					return input.prop('checked');
				else return input.val();
			}

			function sendAsAjax(input) {
				let jinput = $(input);
				let data = {
					id: itemId,
					model: dataModel, 
					name: jinput.attr('name'), 
					value: getValue(jinput)
				};

				Ajax({
					action: 'setValue',
					data: data
				}).then((response)=>{
					app.SendEvent('TOAST', response ? 'The changes have applied' : 'Something wrong');
					app.SendEvent('CHANGED_FIELD', data);
				});
			}

			form.find('input').change((e)=>{
				if (typeof(validatorList) != 'undefined') {
					validatorList.checkInput(e.currentTarget, (result)=>{
						if (result) sendAsAjax(e.currentTarget);
					});
				} else sendAsAjax(e.currentTarget);
				
				e.stopPropagation();
				return false;
			});

			form.on('submit', (e)=>{
				e.stopPropagation();
				return false;
			});

			submit.parent().css('display', 'none');

		} else {

			function afterCheck(allowSubmit) {
				if (allowSubmit) submit.removeAttr('disabled');
				else submit.prop('disabled', true);
				blockSubmit = false;
			}

			form.find('input').change((e)=>{
				blockSubmit = true;
				if (typeof(validatorList) != 'undefined') {
					validatorList.checkInput(e.currentTarget, afterCheck);
				} else afterCheck(true);
			});

			form.on('submit', (e)=>{
				let block = ajaxMode || blockSubmit;
				if (block) e.stopPropagation();
				return !block;
			});
		}
	}

	$('form').each(passForm);
})
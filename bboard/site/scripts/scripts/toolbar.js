var toolbar;

class ToolbarUser {
	#wicon;
	#listenerId;
	#notifyList;
	#view;
	#listView;
	constructor(toolbarElem) {
		this.#view = toolbarElem;
		this.#wicon = this.#view.find('.warning');
		this.#notifyList = [];

		this.#view.click(this.onUserClick.bind(this));

		this.#listenerId = transport.AddListener('notificationList', ((e)=>{
			this.appendReceiveNotifyList(e.value);
		}).bind(this));

		toolbar = this;

		this.appendReceiveNotifyList(jsdata.notificationList);
		app.AddListener('CHANGED_FIELD', this.onChangedField.bind(this));
	}

	onChangedField(data) {
		if ((data.model == 'DriverModel') && (data.name == 'active')) {
			this.#view.toggleClass('passenger', !data.value)
					.toggleClass('driver', data.value);
		}
	}

	onUserClick() {
		if (this.isNotify())
			this.showNotifyList();
		else document.location.href = BASEURL + '/settings/user';
	}

	isNotify() {
		return this.#notifyList.length > 0;
	}

	#notifyIndexOf(id) {
		for (let i in this.#notifyList)
			if (this.#notifyList[i].id == id) 
				return i;
		return -1;
	}

	removeNotify(id) {
		let idx = this.#notifyIndexOf(id);
		if (idx > -1) {
			this.#notifyList.splice(idx, 1);
			this.showWarning(this.isNotify());
		}
	}

	appendReceiveNotifyList(data) {

		if (!isEmpty(data)) {
			for (let i in data) {
            	if ((data[i].content_type == "changeOrder") && (data[i].state == 'active')) {
            		let part_order = JSON.parse(data[i].text);

            		if (part_order.state == 'wait') {
						this.#notifyList.push($.extend({}, data[i], {
							time: $.format.date(Date.parse(data[i].time), dateTinyFormat),
							text: toLang("OrderCreated")
						}));
					}
            	}
	        }

	        this.showWarning(this.isNotify());
		}
	}

	showWarning(visible) {
		this.#wicon.css('display', visible ? 'block' : 'none');
	}

	showNotifyList() {
		let content = $('<div class="items notifications">');

		for (let i in this.#notifyList) {
			let item = this.#notifyList[i];

			let option = templateClone('notifyItem', item);
			option.find('.trash').click(this.trashClick.bind(this));
			option.data('order_id', item.order_id);
			option.find('.header').click(this.headerClick.bind(this));

			content.append(option);
		}

		let map = $('#map');

		this.#listView = viewManager.Create({modal: true,
						title: toLang('Notifications'),
						content: content}, View, (()=>{
							this.#listView = null;
						}).bind(this));
	}

	notifyOptionHeaderList() {
		return this.#listView.contentElement.find('.option .header');
	}

	#getOrderId(notifyId) {
		return this.#notifyList[this.#notifyIndexOf(notifyId)].content_id;
	}

	showOfferView(order_id) {
		let order = null;

		function showOrder() {
			let remaindDistance = takenOrders ? takenOrders.remaindDistance() : 0;
			let view = viewManager.Create({modal: true,
                title: 'OrderCreated',
                content: templateClone('offerView', order),
                actions:
	                {
	                	'Offer to perform': ()=>{
	                		Ajax({
				                action: 'offerToPerform',
				                data: {id: order_id, remaindDistance: remaindDistance }
				            }).then(((response)=>{
				                if (response && (response.result == 'ok'))
				                	view.Close();
		                		else view.trouble(response);
				            }).bind(this));
		                }
	                }
            }, View);
		}

		Ajax({
			action: 'getOrder',
			data: order_id
		}).then(((result)=>{
			order = result;
			if (!this.#listView)
				showOrder();
		}).bind(this));

		this.#listView.Close().then(()=>{
			if (order) showOrder();
		});
	}

	headerClick(e) {
		
		let option = $(e.currentTarget).closest('.option');
		let order_id = this.#getOrderId(option.data('id'));
		if (order_id && v_map) {

			if (user.asDriver) {
				if (!takenOrders.selOrderView) {
					this.#listView.Close();
					takenOrders.ShowInfoOrder(order_id);
				}
				else this.showOfferView(order_id);
 			} else {
				this.#listView.Close();
 				v_map.MarkerManager.ShowMarkerOfOrder(order_id);
 			}
		}
	}

	trashClick(e) {
		
		let option = $(e.currentTarget).closest('.option');
		let nid = option.data('id');
		transport.SendStatusNotify({id: nid}, 'read');
		this.removeNotify(nid);
		option.remove();

		if (this.notifyOptionHeaderList().length == 0)
			this.#listView.Close();
	}
	/*

	getOrder(notify_id) {

		let order = this.#notifyList[this.#notifyIndexOf(notify_id)].content;

		if (isStr(order.start)) order.start = JSON.parse(order.start);
		if (isStr(order.finish)) order.finish = JSON.parse(order.finish);

		return order;
	}

	toMap(notify_id) {

		let order = this.getOrder(notify_id);
		if (v_map) {
			v_map.MarkerManager.ShowMarkerOfOrder(order.id, order);
		} else window.location.href = BASEURL + '/map/driver/' + order.id;

		this.#listView.Close();
	}

	acceptOrder(notify_id) {
		let order = this.getOrder(notify_id);
		
		if (order) {
			Ajax({
	            action: 'offerToPerform',
	            data: JSON.stringify({id: order.id})
	        }).then(((response)=>{
	            if (response.result == 'ok')
	                this.#listView.Close()
	            		.then(()=>{
	            			app.showQuestion(toLang('Offer sent'));
	            		});
	            else console.log(response);
	        }).bind(this));

		}
	}*/

	destroy() {
		transport.RemoveListener(this.#listenerId);
	}
}

$(window).ready(()=>{
	$('body').click((e)=>{
		let tm = $('#toolbarMenu');
		if (($(e.target).parents('#toolbarMenu').length == 0) && (tm.hasClass('open')))
			tm.removeClass('open');
	});
});
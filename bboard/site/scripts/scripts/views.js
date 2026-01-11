class ViewManager {
    openedViews = {};

    Create(options, classView = View, afterDestroy = null) {
        let idx = options.name ? options.name : JSON.stringify(options.content);

        return this.openedViews[idx] = new classView(options, ()=>{
            if (afterDestroy) afterDestroy();
            delete this.openedViews[idx];
        });
    }

    CurrentView() {
        for (let i in this.openedViews)
            return this.openedViews[i];
        return null;
    }

    
}

ViewManager.resizeMap = function(layer = '#windows') {

    function maxHeight() {
        let result = 0;
        $(layer + ' .view').each((i, v)=>{
            v = $(v);
            if (v.hasClass('bottom'))
                result = Math.max($(v).outerHeight(), result);
        })
        return result;
    }

    setTimeout((()=>{
        let h = v_map.View.height();
        v_map.View.children().css('height', Math.round((h - maxHeight()) / h * 100) + '%');
    }).bind(this), 300); 
}

ViewManager.setContent = function($this, content, clone = false)  {

    if ($this.children)
        for (let idx in $this.children)
            $this.children[idx].destroy();
    $this.children = {};

    $this.children = {};
    if ($.type(content) === 'array') {
        let field_number = 0;
        for (let i in content) {
            let idx = i;
            if (content[i].id) idx = content[i].id;

            ($this.children[idx] = new content[i].class($this, $.extend({field_number: field_number}, content[i])));
            field_number++;
        }
    } else {
        $this.children[0] = clone ? $(content).clone() : $(content);
        $this.contentElement.append($this.children[0]);
    }
}

class BaseParentView {

    children;

    constructor() {
        this.children = {};
    }

    fieldById(idx) {

        if ($.type(idx) == 'string') {
            for (let i in this.children) {
                let ch = this.children[i];
                let r = ch.fieldById(idx);
                if (!isEmpty(r))
                    return r;
                if (ch.name == idx)
                    return ch;
            }
        }

        return this.children[idx];
    }

    getValues(fields=null) {
        var values = {};
        $.each(this.children, function(i, field) {
            if (field.name) {
                if (!fields || (fields.indexOf(field.name) > -1))
                    values[field.name] = field.value;
            } else values = $.extend(values, field.getValues());
        });
        return values;
    }

    trouble(msg = "") {
        console.log(msg);
        this.view.addClass('trouble');
        setTimeout((()=>{
            this.view.removeClass('trouble');
        }).bind(this), 1000);
    }


    setValues(elem, attibutes) {

        if ($.type(attibutes) == 'object') {
            for (let i in attibutes)
                if (isFunc(attibutes[i]))
                    elem.click(attibutes[i]);
                else elem.prop(i, attibutes[i]);
        }
        else if ($.type(attibutes) == 'function') 
            elem.click(attibutes);
        else if ($.type(attibutes) == 'string') 
            eval('elem.click(' + attibutes + ')');
    }

    blockClickTemp(e, time=2000) {
        let elem = $(e.currentTarget);
        elem.prop("disabled", true);
        setTimeout(()=>{
            elem.prop("disabled", false);
        }, time);
    }
}

class View extends BaseParentView {
    view;
    closeBtn;
    headerElement;
    contentElement;
    footerElement;
    constructor(options = {}, afterDestroy = null) {
        super();
        this.afterDestroy = afterDestroy;
        this.setOptions(options);
        this.initView();
        setTimeout(this.afterConstructor.bind(this), 5);
    }

    afterConstructor() {
        $(window).on('resize', this.onResize.bind(this));
    }

    onCloseBtnClick() {
        this.prepareToClose(this.Close.bind(this));
    }

    prepareToClose(afterPrepare) {
        afterPrepare();
    }

    initView() {

        this.view = templateClone(this.options.template, this.options);
        this.windows = this.options.parent ? this.options.parent : $('#' + (this.options.modal ? modalLayerId : windowsLayerId));
        this.windows.append(this.view);

        this.closeBtn = (this.headerElement = this.view.find('.header')).find('.close');
        this.contentElement = this.view.find('.content');
        this.footerElement = this.view.find('.btn-block');

        this.closeBtn.click(this.onCloseBtnClick.bind(this));

        for (let i in this.options.classes)
            this.contentElement.addClass(this.options.classes[i]);

        let tlt = this.options.title;
        if (tlt) {
            if (!this.titleElement)
                this.titleElement = this.headerElement.find('h3');
            if (isStr(tlt))
                this.titleElement.text(toLang(tlt));
            else this.titleElement.append(tlt);
        }

        let actions = this.options.actions;
        for (let action in actions) {
            let btn = $('<button class="button">');
            btn.text(toLang(action));
            this.setValues(btn, actions[action]);
            this.footerElement.append(btn);
        }

        this.SetContent(this.options.content);
        
        setTimeout(this.toAlign.bind(this), 10);
        setTimeout(this.checkOverflow.bind(this), 500);
    }

    SetContent(content) {
        ViewManager.setContent(this, this.options.content = content, this.options.clone);
    }

    setOptions(options) {
        this.options = $.extend({content: [], actions: [], template: 'view'}, options);
        
        if (this.options.modal) this.blockBackground(true);
    }

    toAlign() {
        let size = { x: $(window).width(), y: $(window).height() };
        if (!this.options.topAlign) {
            if (this.options.bottomAlign) {
                this.view.removeClass('radius')
                    .addClass('bottom')
                    .addClass('radiusTop');

                ViewManager.resizeMap();
            }
            //else this.view.css('top', ($(window).height() - this.view.outerHeight(true)) / 2);
        }
    }

    checkOverflow() {
        /*
        let elem = this.contentElement[0];
        if (elem.offsetHeight < elem.scrollHeight)
            this.contentElement.css('overflow-y', 'scroll');
        if (elem.offsetWidth < elem.scrollWidth)
            this.contentElement.css('overflow-x', 'scroll');
            */
    }

    onResize() {
        this.toAlign();
    }

    destroy() {
        this.view.trigger('destroy');
        this.view.remove();
        $(window).off('resize', this.onResize.bind(this));
        this.afterDestroy();
        delete this;
    }

    Close() {

        if (this.options.modal) this.blockBackground(false);
        this.view.addClass("hide");

        return new Promise(((resolveOuter) => {
            setTimeout((()=>{
                this.destroy();
                resolveOuter();
            }).bind(this), 600);
        }).bind(this));
    }

    blockBackground(value) {
        if (value) $('.wrapper').addClass('modal');
        else $('.wrapper').removeClass('modal');
    }

    getInput(name) {
        return this.view.find('input[name="' + name + '"]');
    }
}

class BottomView extends View {

    setOptions(options) {
        options = $.extend({bottomAlign: true}, options);
        super.setOptions(options);
    }

    Close() {
        ViewManager.resizeMap();
        return super.Close();
    }
}

class BaseField extends BaseParentView {
    view;
    #listeners;

    get name() { return this.options.name; };
    get value() { return this.val(); };
    get listeners() { return this.#listeners; };

    constructor(options = null) {
        super();
        this.#listeners = [];
        this.options = $.extend({}, options);
    }

    val() {
        return this.getInput().val();
    }

    change(onFunc) {
        this.getInput().change(onFunc);
    }

    getInput() {
        return this.view.find('input');
    }
}

class Form extends BaseParentView {

    contentElement;
    constructor(formElem) {
        super();
        this.contentElement = formElem;
        this.initFields();
    }

    initFields() {
        this.contentElement.find('.field').each(((i, elem)=>{
            let input = $(elem).find('input');
            if (!isEmpty(input)) {
                let field = new PageFormField($(elem), input);
                this.children[field.name] = field;
            }
        }).bind(this));
    }
}

class PageFormField extends BaseField {

    #input;
    constructor(fieldElem, input, options = null) {
        super($.extend({name: input.attr('name')}, options));
        this.view = fieldElem;
        this.#input = input;
    }

    getInput() {
        return this.#input;
    }
}

class BaseViewField extends BaseField {

    constructor(parent, options = null) {
        super(options);
        this.parentElement = parent.contentElement;
        this.parent = parent;

        this.initView();
        this.view.addClass('field-' + this.options.field_number);

        if (this.options.validator)
            validatorList.add(new this.options.validator(this));
    }

    getView() {
        let result = this.parent;
        while (result.parent) {result = result.parent; };
        return result;
    }

    initView() {
    }
}

class HiddenField extends BaseViewField {
    initView() {
        this.view = createField(this.parentElement, this.options, '<input type="hidden">');
    }
}

class DividerField extends BaseViewField {
    initView() {
        this.view = createField(this.parentElement, this.options, '<div class="divider">');
    }
}

class HtmlField extends BaseViewField {
    initView() {
        if (this.options.content)
            this.view = this.options.content;
        else this.view = templateClone($(this.options.source), this.options);
        this.parentElement.append(this.view);
    }
}


class TextField extends BaseViewField {

    initView() {
        this.view = createField(this.parentElement, this.options, '<p>');
    }
}


class TextInfoField extends TextField {

    initView() {
        super.initView();
        this.view.addClass('InfoField');
        this.view.parent().append((this.infoView = $('<span class="infoView">')).text(this.options.info));

        if (this.options.info)
            this.infoView.addClass('showInfo');
    }
}

class DateTimeField extends BaseViewField {

    initView() {
        let cont = $('<div>');
        this.view = createField(this.parentElement, this.options, cont);
        this.component = new DateTime(cont, this.options);
    }

    val() {
        return this.component.val();
    }
}


class FormField extends BaseViewField {
    initView() {
        this.view = createField(this.parentElement, this.options, '<input type="text"/>');
    }
}

class ButtonField extends BaseViewField {
    initView() {
        this.view = createButton(this.parentElement, this.options.label, (()=>{
            this.getView().Close().then(this.options.action());
        }).bind(this));
    }
}


class GroupFields extends BaseViewField {

    initView() {
        this.parentElement.append(this.view = this.contentElement = $('<div class="group">'));
        for (let i in this.options.classes)
            this.view.addClass(this.options.classes[i]);

        ViewManager.setContent(this, this.options.content, this.options.clone);
    }

    val() {
        return this.getValues();
    }
}


function createButton(parent, caption, action) {
    let result;
    parent.append(result = $('<button class="button radius shadow">'));
    result.text(toLang(caption));
    result.click(action);
    return result;
}

function createField(parent, fieldParam, tag) {
    let container;
    let element;
    let label;

    parent.append(container = $('<div class="field">'));

    if (fieldParam.id)
        container.attr("data-id", fieldParam.id);

    if (fieldParam.label) {
        container.append((label = $('<label class="title">'))
                .text(toLang(fieldParam.label)));
        //if (fieldParam.name)
            //label.attr("for", fieldParam.name);
    }
    container.append(element = $(tag));

    if (fieldParam.name)
        element.attr("name", fieldParam.name);

    if (fieldParam.text)
        element.text(toLang(fieldParam.text));

    if (fieldParam.value)
        element.val(fieldParam.value);

    if (fieldParam.readonly)
        element.prop('readonly', true);

    return container;
}

var viewManager;
var formView;

$(window).ready(()=>{
    viewManager = new ViewManager();
    if ($('#' + windowsLayerId).length == 0) {
        $('#back-content').prepend($('<div id="' + modalLayerId + '">'));
        $('.wrapper').prepend($('<div id="' + windowsLayerId + '">'));
    }

    let pageForm = $('form');
    if (pageForm) {
        formView = new Form(pageForm);
    }
});
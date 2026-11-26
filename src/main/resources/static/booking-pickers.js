// Keep the original fields as the source of truth for availability, week shortcuts and floor switching.
(() => {
    if (!('showPopover' in HTMLElement.prototype)) return;
    const monthName = new Intl.DateTimeFormat('ru', {month:'long', year:'numeric'});
    const fullDate = new Intl.DateTimeFormat('ru', {day:'numeric', month:'long', year:'numeric'});
    const pad = n => String(n).padStart(2,'0');

    function button(label, action, accessibleLabel) {
        const element = document.createElement('button');
        element.type = 'button';
        element.textContent = label;
        if (accessibleLabel) element.setAttribute('aria-label', accessibleLabel);
        element.addEventListener('click', action);
        return element;
    }

    function calendar(menu, field, choose) {
        const month = new Date(field.value + 'T12:00:00');
        month.setDate(1);
        const header = document.createElement('div');
        header.className = 'calendar-header';
        const title = document.createElement('strong');
        title.setAttribute('aria-live','polite');
        const grid = document.createElement('div');
        grid.className = 'calendar-grid';

        function render(offset) {
            month.setMonth(month.getMonth() + offset);
            title.textContent = monthName.format(month);
            grid.replaceChildren();
            for (const weekday of ['Пн','Вт','Ср','Чт','Пт','Сб','Вс']) {
                const label = document.createElement('small');
                label.textContent = weekday;
                grid.append(label);
            }
            const total = new Date(month.getFullYear(), month.getMonth()+1, 0).getDate();
            for (let day=1; day<=total; day++) {
                const value = month.getFullYear()+'-'+pad(month.getMonth()+1)+'-'+pad(day);
                const item = button(day, () => choose(value), fullDate.format(new Date(value+'T12:00:00')));
                item.setAttribute('aria-pressed', String(value === field.value));
                if (day===1) item.style.gridColumnStart = (month.getDay()+6)%7+1;
                grid.append(item);
            }
        }
        header.append(button('‹', () => render(-1), 'Предыдущий месяц'),title,
            button('›', () => render(1), 'Следующий месяц'));
        menu.append(header,grid);
        render(0);
    }

    function times(menu, field, choose) {
        const editor = document.createElement('form');
        editor.className = 'time-editor';
        const input = document.createElement('input');
        Object.assign(input,{type:'text',value:field.value,required:true,maxLength:5,placeholder:'ЧЧ:ММ',pattern:'([01][0-9]|2[0-3]):[0-5][0-9]'});
        input.setAttribute('aria-label','Точное время, часы и минуты');
        const apply = document.createElement('button');
        apply.textContent = 'Применить';
        editor.append(input, apply);
        editor.onsubmit = event => { event.preventDefault(); choose(input.value); };
        const list = document.createElement('div');
        list.className = 'time-slots';
        const values = new Set([field.value]);
        for(let hour=0;hour<24;hour++) for(const minute of ['00','30']) values.add(pad(hour)+':'+minute);
        for(const value of [...values].sort()) {
            const item = button(value, () => choose(value));
            item.setAttribute('aria-pressed', String(value===field.value));
            list.append(item);
        }
        menu.append(editor,list);
    }

    for (const field of [date,start,end,floorSelect]) {
        const label = field.labels[0];
        const name = label.textContent;
        const trigger = document.createElement('button');
        trigger.type = 'button';
        trigger.className = 'picker-trigger';
        trigger.id = field.id+'-trigger';
        label.htmlFor = trigger.id;
        const menu = document.createElement('div');
        menu.popover = 'auto';
        menu.id = field.id+'-menu';
        menu.className = 'booking-popover';
        menu.setAttribute('role','group');
        menu.setAttribute('aria-label',name);
        trigger.popoverTargetElement = menu;
        field.after(trigger);
        document.body.append(menu);
        field.hidden = true;

        function sync() {
            let text = field.value;
            if(field===floorSelect) text = field.selectedOptions[0].textContent;
            if(field===date) text = fullDate.format(new Date(text+'T12:00:00'));
            trigger.textContent = text;
            trigger.setAttribute('aria-label',name+' — '+text);
        }
        function choose(value) {
            field.value = value;
            field.dispatchEvent(new Event('input',{bubbles:true}));
            field.dispatchEvent(new Event('change',{bubbles:true}));
            menu.hidePopover();
            trigger.focus({preventScroll:true});
        }
        function position() {
            const rect = trigger.getBoundingClientRect();
            const above = rect.top-10, below = innerHeight-rect.bottom-10;
            const openAbove = below < menu.scrollHeight && above > below;
            menu.style.maxHeight = Math.max(44, openAbove ? above : below)+'px';
            menu.style.left = Math.max(8,Math.min(rect.left,innerWidth-menu.offsetWidth-8))+'px';
            menu.style.top = (openAbove ? rect.top-menu.offsetHeight-5 : rect.bottom+5)+'px';
        }
        menu.addEventListener('beforetoggle',event=>{
            if(event.newState!=='open') return;
            menu.replaceChildren();
            if(field===date) calendar(menu,field,choose);
            else if(field===floorSelect) {
                for(const option of field.options) {
                    const item = button(option.text,()=>choose(option.value));
                    item.setAttribute('aria-pressed',String(option.selected));
                    menu.append(item);
                }
            } else times(menu,field,choose);
        });
        menu.addEventListener('toggle',()=>{
            if(menu.matches(':popover-open')) {
                position();
                const list = menu.querySelector('.time-slots');
                if(list) {
                    const selected = list.querySelector('[aria-pressed=true]');
                    list.scrollTop = selected.offsetTop-list.clientHeight/2;
                }
                window.addEventListener('resize',position);
                window.addEventListener('scroll',position);
            } else {
                window.removeEventListener('resize',position);
                window.removeEventListener('scroll',position);
            }
        });
        trigger.addEventListener('click',event=>{if(field.disabled)event.preventDefault();});
        if(field===floorSelect) new MutationObserver(()=>{trigger.disabled=field.disabled;}).observe(field,{attributes:true,attributeFilter:['disabled']});
        field.addEventListener('input',sync);
        field.addEventListener('change',sync);
        sync();
    }
})();

window.addEventListener("load",(e)=>{
    fetch('./room.json')
        .then(function (response) {
            return response.json();
        })
        .then(function (data) {
            const main = document.querySelector("main");
            const imgnote = new ImgNote(main, data);
            window.imgnote = imgnote;
            console.log(imgnote);
        })
        .catch(function (err) {
            console.log(`error : ${err}`);
        });
});

class ImgNote {
    constructor(DOMparent, data={}){
        this.data = data;
        this.size = this.data.size||4;
        this.keys = {
            metaKey: false,
            ctrlKey: false,
            shiftKey: false,
            altKey: false,
            key: null,
            code: null
        };
        this.mousedown = false;
        this.selectedNoteId = null;
        this.initializeDOM(DOMparent);
        this.initializeEventListener();
        document.title = `ImgNote - ${data.name}`;
    }

    initializeDOM(parentNode){
        this.dom = {};
        this.dom.root = parentNode;
        this.dom.root.classList.add("imgnote-app");

        this.dom.container = this.createAndAppendElement(parentNode, "div", {
            class: "imgnote-container center"
        });

        this.dom.noteContainer = this.createAndAppendElement(this.dom.container, "div", {
            class: "imgnote-note-container none"
        });

        this.dom.imgContainer = this.createAndAppendElement(this.dom.container, "div", {
            class: "imgnote-img-container center"
        });

        this.dom.img = this.createAndAppendElement(this.dom.imgContainer, "img",{
            src: this.data.image,
            draggable: false,
            class: "imgnote-img center",
            alt: "main Image"
        });

        this.dom.note = {};
    }

    initializeEventListener(){
        this.dom.img.addEventListener('error', ()=>{console.error('Image failed to load');});
        this.dom.img.addEventListener('load', this.imgLoadEventListener.bind(this));
        this.dom.imgContainer.addEventListener('mousedown', this.imgMousedownEventListener.bind(this));
        this.dom.imgContainer.addEventListener('mousemove', this.imgMousemoveEventListener.bind(this));
        this.dom.img.addEventListener('dragstart', (e)=>{e.preventDefault();});

        window.addEventListener('resize',  this.plotImgNote.bind(this));
        window.addEventListener('keydown', this.winowKeydownEventListener.bind(this));
        window.addEventListener('keyup',   this.windowKeyupEventListener.bind(this));
        window.addEventListener('mousedown', this.windowMousedownEventListener.bind(this));
        window.addEventListener('mouseup', this.windowMouseupEventListener.bind(this));
    }

    changeMode(mode) {
        const allModeClass = ["none", "center", "left-center", "top-center", "right-center", "bottom-center"];
        allModeClass.forEach(modeClass=>{
            this.dom.imgContainer.classList.remove(modeClass);
            this.dom.noteContainer.classList.remove(modeClass);
        });
        switch (mode) {
            case 'center':
                // console.log("mode center");
                this.dom.noteContainer.classList.add("none");
                this.dom.imgContainer.classList.add("center");
                break;
            case 'left':
                // console.log("mode left");
                this.dom.noteContainer.classList.add("right-center");
                this.dom.imgContainer.classList.add("left-center");
                break;
            case 'top':
                // console.log("mode top");
                this.dom.noteContainer.classList.add("bottom-center");
                this.dom.imgContainer.classList.add("top-center");
                break;
            case 'right':
                // console.log("mode right");
                this.dom.noteContainer.classList.add("left-center");
                this.dom.imgContainer.classList.add("right-center");
                break;
            case 'bottom':
                // console.log("mode bottom");
                this.dom.noteContainer.classList.add("top-center");
                this.dom.imgContainer.classList.add("bottom-center");
                break;
            default:
                console.log(`There are not exist ${mode}!`);
                return false;
        }
        this.plotImgNote();
        return true;
    }

    plotImgNote(){
        this.dom.notes.forEach(noteDOM=>{
            const id = noteDOM.id;
            const note = this.data.notes.find(item=>item.id===id);
            const notePositionPixel = this.getNotePosition(note.x, note.y);
            noteDOM.style.left = `${notePositionPixel.Xpx}px`;
            noteDOM.style.top  = `${notePositionPixel.Ypx}px`;
        });
    }

    imgLoadEventListener(e){
        console.log('Image loaded successfully');
        const promises = [];
        this.dom.notes = [];
        this.data.notes.forEach(note=>{
            const id = note.id;
            const notePositionPixel = this.getNotePosition(note.x, note.y);
            const promise = this.createNoteDOM(notePositionPixel.Xpx, notePositionPixel.Ypx, id);
            promises.push(promise);
        });

        Promise.all(promises).then((noteDOM)=> {
            this.changeMode(this.data.mode);
        });
    }

    imgMousedownEventListener(e){
        if(this.keys.metaKey) {
            const id = Number(`${Math.floor(Math.random()*1E7)}`.replace(".",""));
            const mouse = this.getPositionInImgContainer(e);
            const imgContainerRect = this.dom.imgContainer.getBoundingClientRect();
            const imgContainerLeft = imgContainerRect.left;
            const imgContainerTop  = imgContainerRect.top;
            // Actually, the postion get from the event `e`, is the global postion with repect to the screen,
            // so here I minus the img-container position, in odrder to fixed the position of the note point.
            // Since, if I didn't using these, when the position of img-container is not located at (0,0),
            // the point will disapear.
            this.createNoteDOM(e.clientX-imgContainerLeft, e.clientY-imgContainerTop, id);
            this.data.notes.push({
                id: `${id}`,
                x: mouse.x,
                y: mouse.y
            });
        } else {
            const noteDOM = document.elementFromPoint(e.clientX, e.clientY);
            const tagName = noteDOM.tagName.toLowerCase();
            this.dom.notes.forEach(e=>e.classList.remove('selected'));
            this.selectedNoteId = null;
            this.dom.noteContainer.innerHTML = '';
            if(tagName==='img') return;
            noteDOM.classList.add('selected');
            const id = noteDOM.id;
            const note = this.data.notes.find(item=>item.id===id);
            this.selectedNoteId = id;
            this.displayNote(note);
        }
    }

    imgMousemoveEventListener(e){
        if(this.selectedNoteId && this.mousedown){
            const selectedNote = this.data.notes.find(item=>item.id===this.selectedNoteId);
            if(this.dom.note){
                this.dom.note.valueId.innerText = selectedNote.id;
                if(selectedNote.note) {
                   this.dom.note.text.value = selectedNote.note;
                }
            }
            if (!this.keys.shiftKey) return;
            const notePosition = this.getPositionInImgContainer(e);
            selectedNote.x = notePosition.x;
            selectedNote.y = notePosition.y;
            if(this.dom.note){
                this.dom.note.valueX.innerText = selectedNote.x;
                this.dom.note.valueY.innerText = selectedNote.y;
            }
        }
    }

    windowMousedownEventListener(e){
        this.mousedown = true;
        if(this.keys.shiftKey){
            this.dom.img.style.cursor = "none";
        }
    }
    
    windowMouseupEventListener(e){
        this.mousedown = false;
        this.dom.img.style.cursor = "default";
    }

    winowKeydownEventListener(e){
        this.keydown = true;
        const key = e.key;
        const code = e.code;
        const metaKey = e.metaKey;
        const ctrlKey = e.ctrlKey;
        const altKey = e.altKey;
        const shiftKey = e.shiftKey;
        this.keys = {
            metaKey: metaKey,
            ctrlKey: ctrlKey,
            altKey: altKey,
            shiftKey: shiftKey,
            key: key,
            code: code
        };
        if(false){}
        // change mode
        else if (altKey&&code==='Digit0'){
            this.changeMode('center');
        }
        else if (altKey&&code==='Digit1'){
            this.changeMode('left');
        }
        else if (altKey&&code==='Digit2'){
            this.changeMode('top');
        }
        else if (altKey&&code==='Digit3'){
            this.changeMode('right');
        }
        else if (altKey&&code==='Digit4'){
            this.changeMode('bottom');
        }
        // export configuration
        else if (metaKey&&key==='e'){
            this.export();
        }

        // export configuration
        else if (metaKey&&key==='d'){
            this.download();
        }

        if(this.keys.metaKey){
            this.dom.img.style.cursor = 'crosshair';
        }
    }

    windowKeyupEventListener(e){
        this.keys = {
            metaKey: false,
            ctrlKey: false,
            altKey: false,
            shiftKey: false,
            key: null,
            code: null
        };
        this.dom.img.style.cursor = "default";
    }

    displayNote(noteItem){
        this.dom.note = {};
        this.dom.note.title = this.createAndAppendElement(this.dom.noteContainer, "div", {
            class: "imgnote-note-title"
        });

        this.dom.note.text = this.createAndAppendElement(this.dom.noteContainer, "textarea", {
            class: "imgnote-note-text",
            placeholder: "type some notes...",
            value: noteItem.note||''
        });

        this.dom.note.labelId = this.createAndAppendElement(this.dom.note.title, "h4", {
            class: "imgnote-note-label",
            innerText: "ID : ",
        });

        this.dom.note.labelX = this.createAndAppendElement(this.dom.note.title, "h5", {
            class: "imgnote-note-label",
            innerText: "x : ",
        });

        this.dom.note.labelY = this.createAndAppendElement(this.dom.note.title, "h5", {
            class: "imgnote-note-label",
            innerText: "y : ",
        });

        this.dom.note.valueId = this.createAndAppendElement(this.dom.note.labelId, "input", {
            class: "imgnote-note-value",
            placeholder: "type id...",
            value: noteItem.id
        });

        this.dom.note.valueX = this.createAndAppendElement(this.dom.note.labelX, "label", {
            class: "imgnote-note-value",
            innerText: noteItem.x
        });

        this.dom.note.valueY = this.createAndAppendElement(this.dom.note.labelY, "label", {
            class: "imgnote-note-value",
            innerText: noteItem.y
        });

        this.dom.note.valueId.addEventListener("input",((e)=>{
            noteItem.id = this.dom.note.valueId.value;
        }).bind(this));

        this.dom.note.text.addEventListener("input",((e)=>{
            if(!noteItem.note) noteItem.note = "";
            noteItem.note = this.dom.note.text.value;
            if(!noteItem.note) noteItem.note = undefined; 
        }).bind(this));
    }

    addDragEventListener(element) {
        let offsetX, offsetY, mouseDown = false;

        const onMouseMove =(e)=> {
            if (!mouseDown) return;
            if (!this.keys.shiftKey) return;
            const imgContainerRect = this.dom.imgContainer.getBoundingClientRect();
            const imgContainerLeft = imgContainerRect.left;
            const imgContainerTop  = imgContainerRect.top;

            let newX = e.clientX - offsetX - imgContainerLeft;
            let newY = e.clientY - offsetY - imgContainerTop;
            
            element.style.left = `${newX+3}px`;
            element.style.top = `${newY+3}px`;
        };

        element.addEventListener('mousedown', (e) => {
            mouseDown = true;
            offsetX = e.clientX - element.getBoundingClientRect().left;
            offsetY = e.clientY - element.getBoundingClientRect().top;

            // Add mousemove listener on document to handle dragging outside the element
            document.addEventListener('mousemove', onMouseMove);
        });

        document.addEventListener('mouseup', () => {
            if (!mouseDown) return;
            mouseDown = false;
            document.removeEventListener('mousemove', onMouseMove);
        });
    }

    createNoteDOM(Xpx, Ypx, id){
        return new Promise((resolve, reject) => {
            const noteDOM = this.createAndAppendElement(this.dom.imgContainer, "div",{
                draggable: false,
                class: "imgnote-note",
                id: id
            });
            noteDOM.style.left = `${Xpx}px`;
            noteDOM.style.top  = `${Ypx}px`;
            noteDOM.style.width  = `${this.size}px`;
            noteDOM.style.height = `${this.size}px`;
            noteDOM.style.marginTop  = `-${this.size/2}px`;
            noteDOM.style.marginLeft = `-${this.size/2}px`;
            this.dom.notes.push(noteDOM);
            this.addDragEventListener(noteDOM);
            resolve(noteDOM);
        });
    }

    download(){
        const date = new Date();
        const timeFormat = `${date.getMonth()+1}-${date.getDay()}-${date.getHours()}-${date.getMinutes()}`
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(this.data,null,4));
        const element = document.createElement('a');
        element.setAttribute("href", dataStr);
        element.setAttribute("download", `room-${timeFormat}.json`);
        this.dom.root.appendChild(element);
        element.click();
        element.remove();
    }

    export(){
        console.log(JSON.stringify(this.data,null,4))
    }

    getNotePosition(x, y){
        // ok
        const imgRealSize = this.getObjectFitContainSize(this.dom.img);
        const imgLeft = (this.dom.img.offsetWidth - imgRealSize.width) / 2;
        const imgTop  = (this.dom.img.offsetHeight - imgRealSize.height) / 2;
        // const imgContainerLeft = this.dom.imgContainer.clientLeft;
        // const imgContainerTop  = this.dom.imgContainer.clientTop;
        const Wpx = imgRealSize.width;
        const Hpx = imgRealSize.height;
        const Xpx = imgLeft + Wpx * x;
        const Ypx = imgTop  + Hpx * y;
        return {Xpx,Ypx};
    }

    getPositionInImgContainer(e){
        const imgRealSize = this.getObjectFitContainSize(this.dom.img);
        const imgLeft = (this.dom.img.offsetWidth - imgRealSize.width) / 2;
        const imgTop = (this.dom.img.offsetHeight - imgRealSize.height) / 2;
        const imgContainerRect = this.dom.imgContainer.getBoundingClientRect();
        const imgContainerLeft = imgContainerRect.left;
        const imgContainerTop  = imgContainerRect.top;
        const Xpx = e.clientX - imgLeft - imgContainerLeft;
        const Ypx = e.clientY - imgTop - imgContainerTop;

        return {
            x: Xpx/imgRealSize.width,  // x in ratio 
            y: Ypx/imgRealSize.height, // y in ratio 
            Xpx: Xpx,   // x in pixel 
            Ypx: Ypx    // y in pixel 
        }
    }

    getObjectFitContainSize(imgNode) {
        var ratio = imgNode.naturalWidth / imgNode.naturalHeight
        var width = imgNode.height * ratio
        var height = imgNode.height
        if (width > imgNode.width) {
            width = imgNode.width
            height = imgNode.width / ratio
        }
        return {width, height}
    }

    createAndAppendElement(parent, tag, attributes = {}) {
        const element = document.createElement(tag);

        // class 
        if (attributes.class) {
            attributes.class.split(" ").forEach(className => element.classList.add(className));
            delete attributes.class;  // delete class in attributes
        }
        // dataset
        if (attributes.dataset) {
            Object.keys(attributes.dataset).forEach(key => element.dataset[key] = attributes.dataset[key]);
            delete attributes.dataset;  // delete dataset in attributes
        }
        // other attributes
        Object.keys(attributes).forEach(key => element[key] = attributes[key]);

        parent.appendChild(element);
        return element;
    }

}
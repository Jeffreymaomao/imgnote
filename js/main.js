window.addEventListener("load", (e) => {
    fetch('./room.json')
        .then(function(response) {
            return response.json();
        })
        .then(function(data) {
            const main = document.querySelector("main");
            const imgnote = new ImgNote(main, data);
            window.imgnote = imgnote;
            console.log(imgnote);
        })
        .catch(function(err) {
            console.log(`error : ${err}`);
        });
});

class ImgNote {
    constructor(DOMparent, data = {}) {
        this.saved = true;
        this.imgURL = null;
        this.imgBase64 = null;
        this.data = data;
        this.size = data.size || 4;
        this.fullscreenMessage = false;
        this.dom = {
            root: DOMparent,
            note: {}
        }
        this.keys = {
            ctrlKey: false,
            shiftKey: false,
            altKey: false,
            key: null,
            code: null
        };
        this.selected = {
            id: null,
            note: null,
            dom: null
        }
        // this.displayLocalStorage();
        const storedData = this.retrieveFromLocalStorage();
        if (storedData) {
            this.data = storedData.data;
            this.imgBase64 = storedData.imgBase64;
            this.initializeMainDOM();
        } else {
            this.initializeLoadDOM()
                .then(()=>{
                    this.initializeMainDOM();
                    document.title = `ImgNote - ${this.data.name || 'Untitled'}`;
                })
                .catch(error => {
                    console.error("Error initializing:", error);
                });
        }
    }

    initializeLoadDOM() {
        return new Promise((resolve, reject) => {
            const initializeContainer = this.createAndAppendElement(this.dom.root, 'div', {
                class: 'imgnote-initialize-container'
            });
            this.dom.initializeContainer = initializeContainer;

            // 左側照片輸入區域
            const imgContainer = this.createAndAppendElement(initializeContainer, 'div', {
                class: 'imgnote-initialize-img-container'
            });

            // 圖片拖放區域
            const imgDropArea = this.createAndAppendElement(imgContainer, 'div', {
                class: 'imgnote-initialize-img-input'
            });

            const imgText = this.createAndAppendElement(imgDropArea, 'div', {
                class: 'imgnote-initialize-img-text',
                textContent: 'Drop an image here or click to select'
            });

            const imgPreview = this.createAndAppendElement(imgDropArea, 'img', {
                class: 'imgnote-initialize-img-preview'
            });

            // 圖片輸入
            const imgInput = this.createAndAppendElement(imgDropArea, 'input', {
                type: 'file',
                accept: 'image/*',
                style: 'display: none;'
            });

            // 點擊選擇圖片的標籤觸發文件輸入
            imgDropArea.addEventListener('click', () => {
                imgInput.click();
            });
            imgDropArea.addEventListener('dragover', (e) => {
                e.preventDefault();
                imgDropArea.classList.add("dragover")
            });
            imgDropArea.addEventListener('dragleave', (e) => {
                e.preventDefault();
                imgDropArea.classList.remove("dragover")
            });

            // ---

            // 右側數據輸入區域
            const dataContainer = this.createAndAppendElement(initializeContainer, 'div', {
                class: 'imgnote-initialize-data-container'
            });

            // 文字輸入框
            const dataTextArea = this.createAndAppendElement(dataContainer, 'textarea', {
                class: 'imgnote-initialize-data-text',
                placeholder: 'Enter JSON data here...'
            });

            const dataInput = this.createAndAppendElement(dataContainer, 'input', {
                id: 'dataInput',
                type: 'file',
                accept: '.json',
                style: 'display: none;' // Hide the input element
            });

            const dataOpenFileButton = this.createAndAppendElement(dataContainer, "button", {
                class: 'imgnote-initialize-data-open-file',
            });

            dataOpenFileButton.addEventListener("click",(e)=>{
                dataInput.click();
            });
            dataTextArea.addEventListener('dragover', (e) => {
                e.preventDefault();
                dataTextArea.classList.add("dragover");
            });
            dataTextArea.addEventListener('dragleave', (e) => {
                e.preventDefault();
                dataTextArea.classList.remove("dragover");
            });

            // ---

            // Create two promises for imgInput and dataInput changes
            const imgInputPromise = new Promise((resolveImgInput) => {
                imgDropArea.addEventListener('drop', (e) => {
                    e.preventDefault();
                    imgDropArea.classList.remove("dragover")
                    const file = e.dataTransfer.files[0];
                    if (file) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                            const base64 = event.target.result;
                            this.imgBase64 = base64;
                            imgPreview.src = base64;
                            imgPreview.alt = file.name;
                            imgPreview.addEventListener("load",(e)=>{
                                resolveImgInput();
                                imgPreview.classList.add("loaded");
                                imgPreview.classList.remove("failed");
                            });
                            imgPreview.addEventListener("error",(e)=>{
                                imgPreview.classList.add("failed");
                                imgPreview.classList.remove("loaded");
                            });
                        }
                        reader.readAsDataURL(file); // 開始讀取文件
                    }
                });

                imgInput.addEventListener('change', (e) => {
                    e.preventDefault();
                    const file = e.target.files[0];
                    imgInput.classList.remove("dragover")
                    if (file) {
                        const reader = new FileReader();
                        reader.onload = (event) => { // 使用事件對象 event
                            const base64 = event.target.result;
                            this.imgBase64 = base64;
                            imgPreview.src = base64;
                            imgPreview.alt = file.name; // 設置圖片的 alt 屬性為文件名
                            resolveImgInput();
                            imgPreview.classList.add("loaded");
                        };
                        reader.readAsDataURL(file); // 開始讀取文件
                    }
                });
            });

            const dataInputPromise = new Promise((resolveDataInput) => {
                dataTextArea.addEventListener('drop', (e) => {
                    e.preventDefault();
                    dataTextArea.classList.remove("dragover");
                    const file = e.dataTransfer.files[0];
                    console.log(file.name)
                    if (file&&file.name.endsWith(".json")) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                            try {
                                const data = JSON.parse(event.target.result); 
                                this.data = data;
                                dataTextArea.innerHTML = JSON.stringify(data,null,4);
                                resolveDataInput(); // Resolve when data input changes
                            } catch (error) {
                                console.error("Error parsing JSON:", error);
                            }
                        };
                        reader.readAsText(file);
                    }
                });
                dataInput.addEventListener('change', (e) => {
                    const file = e.target.files[0];
                    if (file) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                            try {
                                const data = JSON.parse(event.target.result); 
                                this.data = data;
                                dataTextArea.innerHTML = JSON.stringify(data,null,4);
                                resolveDataInput(); // Resolve when data input changes
                            } catch (error) {
                                console.error("Error parsing JSON:", error);
                            }
                        };
                        reader.readAsText(file);
                    }
                });
            });

            // Resolve the main promise when both input promises are resolved
            Promise.all([imgInputPromise, dataInputPromise]).then(() => {
                resolve();
            });
        });
    }


    save(){
        const id = this.md5(JSON.stringify(this.data));
        const saveTime = new Date();
        const data = this.data;
        const img = this.img2base64();
        console.log(JSON.stringify(this.data))
    }

    initializeMainDOM() {
        if(this.dom.initializeContainer) this.dom.initializeContainer.remove();
        
        this.dom.root.classList.add("imgnote-app");

        this.dom.container = this.createAndAppendElement(this.dom.root, "div", {
            class: "imgnote-container center"
        });

        this.dom.infoContainer = this.createAndAppendElement(this.dom.container, "div", {
            class: "imgnote-info-container center"
        });

        this.dom.noteContainer = this.createAndAppendElement(this.dom.container, "div", {
            class: "imgnote-note-container none"
        });

        this.dom.imgContainer = this.createAndAppendElement(this.dom.container, "div", {
            class: "imgnote-img-container center"
        });

        this.dom.img = this.createAndAppendElement(this.dom.imgContainer, "img", {
            src: this.imgBase64,
            draggable: false,
            class: "imgnote-img center",
            alt: "main Image"
        });

        this.initializeEventListener();
    }

    initializeEventListener() {
        this.dom.img.addEventListener('error', () => { console.error('Image failed to load'); });
        this.dom.img.addEventListener('load', this.imgLoadEventListener.bind(this));
        this.dom.imgContainer.addEventListener('mousedown', this.imgMousedownEventListener.bind(this));
        this.dom.imgContainer.addEventListener('mousemove', this.imgMousemoveEventListener.bind(this));
        this.dom.img.addEventListener('dragstart', (e) => { e.preventDefault(); });

        window.addEventListener('resize', this.plotImgNote.bind(this));
        window.addEventListener('keydown', this.winowKeydownEventListener.bind(this));
        window.addEventListener('keyup', this.windowKeyupEventListener.bind(this));
        window.addEventListener('mousedown', this.windowMousedownEventListener.bind(this));
        window.addEventListener('mouseup', this.windowMouseupEventListener.bind(this));
        window.addEventListener('beforeunload', this.windowBeforeUnloadEventListener.bind(this));
    }

    // ---

    changeMode(mode) {
        const allModeClass = ["none", "center", "left-center", "top-center", "right-center", "bottom-center"];
        allModeClass.forEach(modeClass => {
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

    imgLoadEventListener(e) {
        // console.log('Image loaded successfully');
        const promises = [];
        this.dom.notes = [];
        this.data.notes.forEach(note => {
            const id = note.id;
            const notePositionPixel = this.getNotePosition(note.x, note.y);
            const promise = this.createNoteDOM(notePositionPixel.Xpx, notePositionPixel.Ypx, id);
            promises.push(promise);
        });

        Promise.all(promises).then((noteDOM) => {
            this.changeMode(this.data.mode);
        });
    }

    imgMousedownEventListener(e) {
        if (this.keys.code === 'KeyA') {
            // add a new point
            const id = Number(`${Math.floor(Math.random()*1E7)}`.replace(".", ""));
            const mouse = this.getPositionInImgContainer(e);
            const imgContainerRect = this.dom.imgContainer.getBoundingClientRect();
            const imgContainerLeft = imgContainerRect.left;
            const imgContainerTop = imgContainerRect.top;
            // Actually, the postion get from the event `e`, is the global postion with repect to the screen,
            // so here I minus the img-container position, in odrder to fixed the position of the note point.
            // Since, if I didn't using these, when the position of img-container is not located at (0,0),
            // the point will disapear.
            this.createNoteDOM(e.clientX - imgContainerLeft, e.clientY - imgContainerTop, id);
            this.data.notes.push({
                id: `${id}`,
                x: mouse.x,
                y: mouse.y
            });
            this.saved = false;
        } else {
            const noteDOM = document.elementFromPoint(e.clientX, e.clientY);
            const tagName = noteDOM.tagName.toLowerCase();
            this.dom.notes.forEach(e => e.classList.remove('selected'));
            this.selected = {
                id: null,
                note: null,
                dom: null
            }
            // this.dom.noteContainer.innerHTML = '';
            if(this.dom.note) Object.values(this.dom.note).forEach(item=>{item.remove()})
            if (tagName === 'img') return;

            // if tag name is in the image and selected a note DOM
            noteDOM.classList.add('selected');
            const id = noteDOM.id;
            this.selected.id = id;
            this.selected.dom = noteDOM;
            this.selected.note = this.data.notes.find(item => item.id === id);
            this.displaySelectedNote();
        }
    }

    imgMousemoveEventListener(e) {
        if (this.selected.id && this.mousedown) {
            this.saved = false;
            if (this.dom.note) {
                this.dom.note.valueId.innerText = this.selected.note.id;
                if (this.selected.note.text) {
                    this.dom.note.text.value = this.selected.note.note;
                }
            }
            if (this.keys.code !== 'KeyD') return;
            const notePosition = this.getPositionInImgContainer(e);
            this.selected.note.x = notePosition.x;
            this.selected.note.y = notePosition.y;
            if (this.dom.note) {
                this.dom.note.valueX.innerText = this.selected.note.x;
                this.dom.note.valueY.innerText = this.selected.note.y;
            }
        }
    }

    windowMousedownEventListener(e) {
        this.mousedown = true;
    }

    windowMouseupEventListener(e) {
        this.mousedown = false;
        this.dom.notes.forEach(e=>e.style.cursor="");
    }

    winowKeydownEventListener(e) {
        this.keydown = true;
        const key = e.key;
        const code = e.code;
        const metaKey = e.metaKey;
        const ctrlKey = e.ctrlKey||e.metaKey;
        const altKey = e.altKey;
        const shiftKey = e.shiftKey;
        this.keys = {
            ctrlKey: ctrlKey,
            altKey: altKey,
            shiftKey: shiftKey,
            key: key,
            code: code
        };
        // console.log(this.keys);

        if (altKey) {
            if (code === 'Digit0') {
                this.changeMode('center');
                this.saved = false;
            } else if (code === 'Digit1') {
                this.changeMode('left');
                this.saved = false;
            } else if (code === 'Digit2') {
                this.changeMode('top');
                this.saved = false;
            } else if (code === 'Digit3') {
                this.changeMode('right');
                this.saved = false;
            } else if (code === 'Digit4') {
                this.changeMode('bottom');
                this.saved = false;
            } else if (code === 'ArrowUp'){
                this.increaseSize();
                this.saved = false;
            }  else if (code === 'ArrowDown'){
                this.decreaseSize();
                this.saved = false;
            }
        } else if (ctrlKey) {
            if (code === 'KeyE') {
                e.preventDefault();
                e.stopPropagation();
                this.export();
            } else if (code === 'KeyD') {
                e.preventDefault();
                e.stopPropagation();
                this.download();
            } else if (code === 'Backspace') {
                e.preventDefault();
                e.stopPropagation();
                this.deleteSelectedNote();
            }
        }

        // I don't want to let user to move the point only click the keybord.
        // if (!altKey&&(this.selected.note&&this.selected.dom&&this.selected.id)) {
        //     if(code==="ArrowLeft"){
        //         console.log(code)
        //     } else if(code==="ArrowRight"){
        //         console.log(code)
        //     } else if(code==="ArrowUp"){
        //         console.log(code)
        //     } else if(code==="ArrowDown"){
        //         console.log(code)

        //     }
        // }

        // cursor
        if (this.keys.code==="KeyA") {
            this.dom.img.style.cursor = 'crosshair';
        } else if (this.keys.code==="KeyD") {
            this.dom.img.style.cursor = 'grab';
        }
    }

    windowKeyupEventListener(e) {
        this.keys = {
            ctrlKey: false,
            altKey: false,
            shiftKey: false,
            key: null,
            code: null
        };
        this.dom.img.style.cursor = "default";
    }

    windowBeforeUnloadEventListener(e){
        if (!this.saved) {
            // beforeunload
            const confirmationMessage = 'Your changes are not saved. Are you sure you want to leave?';
            (e || window.event).returnValue = confirmationMessage; // For legacy support
            return confirmationMessage;
        }
    }

    addDragEventListener(element) {
        let offsetX, offsetY, mouseDown = false;

        const onMouseMove = (e) => {
            if (!mouseDown) return;
            if (this.keys.code !== 'KeyD') return;
            const imgContainerRect = this.dom.imgContainer.getBoundingClientRect();
            const imgContainerLeft = imgContainerRect.left;
            const imgContainerTop = imgContainerRect.top;

            let newX = e.clientX - offsetX - imgContainerLeft;
            let newY = e.clientY - offsetY - imgContainerTop;

            element.style.left = `${newX+this.size/2}px`;
            element.style.top = `${newY+this.size/2}px`;
        };

        element.addEventListener('mousedown', (e) => {
            mouseDown = true;
            if (this.keys.code === 'KeyD') element.style.cursor = "none";
            offsetX = e.clientX - element.getBoundingClientRect().left;
            offsetY = e.clientY - element.getBoundingClientRect().top;

            // Add mousemove listener on document to handle dragging outside the element
            document.addEventListener('mousemove', onMouseMove);
        });

        document.addEventListener('mouseup', () => {
            if (!mouseDown) return;
            mouseDown = false;
            element.style.cursor = "";
            document.removeEventListener('mousemove', onMouseMove);
        });
    }

    // ---
    deleteSelectedNote(){
        const { note, id, dom } = this.selected;
        if (!note || !id || !dom) return;

        this.displayFullScreenMessage({
            close: false,
            style: "default",
            messageText: `Delete id:${id}?`,
            cancel: true,
            confirm: true,
            confirmColor: "rgb(185,28,28)",
            defaultButton: "confirm",
            confirmEventListener: ()=>{
                dom.remove();
                this.data.notes = this.data.notes.filter(item => item.id !== id);
                this.selected.id = null;
                this.selected.note = null;
                this.selected.dom = null;
                Object.values(this.dom.note).forEach(item=>{item.remove()});
            },
            cancelEventListener: ()=>{
                console.log("Delete cancel!")
            }
        });
    }

    // ---

    plotImgNote() {
        this.dom.notes.forEach(noteDOM => {
            const id = noteDOM.id;
            const note = this.data.notes.find(item => item.id === id);
            const notePositionPixel = this.getNotePosition(note.x, note.y);
            noteDOM.style.left = `${notePositionPixel.Xpx}px`;
            noteDOM.style.top = `${notePositionPixel.Ypx}px`;
        });
    }

    createNoteDOM(Xpx, Ypx, id) {
        return new Promise((resolve, reject) => {
            const noteDOM = this.createAndAppendElement(this.dom.imgContainer, "div", {
                draggable: false,
                class: "imgnote-note",
                id: id
            });
            noteDOM.style.left = `${Xpx}px`;
            noteDOM.style.top = `${Ypx}px`;
            noteDOM.style.width = `${this.size}px`;
            noteDOM.style.height = `${this.size}px`;
            noteDOM.style.marginTop = `-${this.size/2}px`;
            noteDOM.style.marginLeft = `-${this.size/2}px`;
            this.dom.notes.push(noteDOM);
            this.addDragEventListener(noteDOM);
            resolve(noteDOM);
        });
    }

    increaseSize(){
        const speed = this.keys.shiftKey ? 5 : 1;
        this.size += 1 * speed;

        this.dom.notes.forEach(noteDOM=>{
            noteDOM.style.width = `${this.size}px`;
            noteDOM.style.height = `${this.size}px`;
            noteDOM.style.marginTop = `-${this.size/2}px`;
            noteDOM.style.marginLeft = `-${this.size/2}px`;
        });
    }

    decreaseSize(){
        const speed = this.keys.shiftKey ? 5 : 1;
        this.size -= 1 * speed;

        if(this.size<=1) this.size = 1;
        this.data.size = this.size;
        this.dom.notes.forEach(noteDOM=>{
            noteDOM.style.width = `${this.size}px`;
            noteDOM.style.height = `${this.size}px`;
            noteDOM.style.marginTop = `-${this.size/2}px`;
            noteDOM.style.marginLeft = `-${this.size/2}px`;
        });
    }

    // ---

    download() {
        const date = new Date();
        const timeFormat = `${date.getMonth()+1}-${date.getDay()}-${date.getHours()}-${date.getMinutes()}`
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(this.data, null, 4));
        const element = document.createElement('a');
        element.setAttribute("href", dataStr);
        element.setAttribute("download", `room-${timeFormat}.json`);
        this.dom.root.appendChild(element);
        element.click();
        element.remove();
    }

    export () {
        this.displayFullScreenMessage({
            close: true,
            style: "code",
            messageText: "Dataset",
            code: JSON.stringify(this.data, null, "\t")
        });
    }

    // ---

    getNotePosition(x, y) {
        // ok
        const imgRealSize = this.getObjectFitContainSize(this.dom.img);
        const imgLeft = (this.dom.img.offsetWidth - imgRealSize.width) / 2;
        const imgTop = (this.dom.img.offsetHeight - imgRealSize.height) / 2;
        // const imgContainerLeft = this.dom.imgContainer.clientLeft;
        // const imgContainerTop  = this.dom.imgContainer.clientTop;
        const Wpx = imgRealSize.width;
        const Hpx = imgRealSize.height;
        const Xpx = imgLeft + Wpx * x;
        const Ypx = imgTop + Hpx * y;
        return { Xpx, Ypx };
    }

    getPositionInImgContainer(e) {
        const imgRealSize = this.getObjectFitContainSize(this.dom.img);
        const imgLeft = (this.dom.img.offsetWidth - imgRealSize.width) / 2;
        const imgTop = (this.dom.img.offsetHeight - imgRealSize.height) / 2;
        const imgContainerRect = this.dom.imgContainer.getBoundingClientRect();
        const imgContainerLeft = imgContainerRect.left;
        const imgContainerTop = imgContainerRect.top;
        const Xpx = e.clientX - imgLeft - imgContainerLeft;
        const Ypx = e.clientY - imgTop - imgContainerTop;

        return {
            x: Xpx / imgRealSize.width, // x in ratio 
            y: Ypx / imgRealSize.height, // y in ratio 
            Xpx: Xpx, // x in pixel 
            Ypx: Ypx // y in pixel 
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
        return { width, height }
    }

    createAndAppendElement(parent, tag, attributes = {}) {
        const element = document.createElement(tag);

        // class 
        if (attributes.class) {
            attributes.class.split(" ").forEach(className => element.classList.add(className));
            delete attributes.class; // delete class in attributes
        }
        // dataset
        if (attributes.dataset) {
            Object.keys(attributes.dataset).forEach(key => element.dataset[key] = attributes.dataset[key]);
            delete attributes.dataset; // delete dataset in attributes
        }
        // other attributes
        Object.keys(attributes).forEach(key => element[key] = attributes[key]);

        parent.appendChild(element);
        return element;
    }

    retrieveFromLocalStorage() {
        // Retrieve data from localStorage based on id
        const keys = Object.keys(localStorage);
        for (let i = 0; i < keys.length; i++) {
            const key = keys[i];
            if (key.startsWith("imgnote-")) {
                return JSON.parse(localStorage.getItem(key));
            }
        }
        return null;
    }

    // ---

    displayLocalStorage(){
        const keys = Object.keys(localStorage);
        console.log(`length of localStorage: ${keys.length}`)   
        keys.forEach(key => {
            const value = localStorage.getItem(key);
            console.log(`${key}: ${value}`);
        });
    }

    displaySelectedNote() {
        this.dom.note = {};
        this.dom.note.title = this.createAndAppendElement(this.dom.noteContainer, "div", {
            class: "imgnote-note-title"
        });

        this.dom.note.text = this.createAndAppendElement(this.dom.noteContainer, "textarea", {
            class: "imgnote-note-text",
            placeholder: "type some notes...",
            value: this.selected.note.text || '',
            tabIndex: -1
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
            value: this.selected.note.id,
            tabIndex: -1
        });

        this.dom.note.valueX = this.createAndAppendElement(this.dom.note.labelX, "label", {
            class: "imgnote-note-value",
            innerText: this.selected.note.x
        });

        this.dom.note.valueY = this.createAndAppendElement(this.dom.note.labelY, "label", {
            class: "imgnote-note-value",
            innerText: this.selected.note.y
        });

        this.dom.note.valueId.addEventListener("input", (e) => {
            this.saved = false;
            this.selected.dom.id = this.dom.note.valueId.value;
            this.selected.note.id = this.dom.note.valueId.value;
        });

        this.dom.note.text.addEventListener("input", (e) => {
            this.saved = false;
            this.selected.note.text = this.dom.note.text.value;
            if (!this.selected.note.text) this.selected.note.text = undefined;
        });
    }

    displayFullScreenMessage(config = {}) {
        if (this.fullscreenMessage) this.closeFullScreenMessage();
        this.dom.message = {};
        // - config.messageText (string)
        // - config.style ("default"|"code"|"warm")

        // - config.cancel (bool)
        // - config.cancelColor (string)
        // - config.cancelText (string)
        // - config.cancelEventListener (function)

        // - config.confirm (bool)
        // - config.confirmColor (string)
        // - config.confirmText (string)
        // - config.confirmEventListener (function) 

        // - config.closeEventListener (function) 
        // - config.defaultButton ("confirm"|"cancel")

        // Create the background container and blur effect
        this.dom.blurContainer = this.createAndAppendElement(this.dom.root, "div", {
            class: "imgnote-blur-container"
        });

        // Create the message container
        this.dom.message.container = this.createAndAppendElement(this.dom.root, "div", {
            class: "imgnote-fullscreen-message-container"
        });


        // Create the message box
        this.dom.message.box = this.createAndAppendElement(this.dom.message.container, "div", {
            class: "imgnote-fullscreen-message-box"
        });

        // Create the message text
        this.dom.message.text = this.createAndAppendElement(this.dom.message.box, "div", {
            class: "imgnote-fullscreen-message-text",
            innerText: config.messageText || ""
        });

        if(config.code){
            this.dom.message.codeContainer = this.createAndAppendElement(this.dom.message.box, "div", {
                class: "imgnote-fullscreen-message-code-container"
            });

            // Create the code element
            this.dom.message.code = this.createAndAppendElement(this.dom.message.codeContainer, "pre", {
                class: "imgnote-fullscreen-message-code",
                innerText: config.code || ""
            });

            // Create the copy button
            this.dom.message.copyButton = this.createAndAppendElement(this.dom.message.codeContainer, "button", {
                class: "imgnote-fullscreen-message-copy-button",
            });

            // Add event listener to copy button
            this.dom.message.copyButton.addEventListener("click", () => {
                // Copy code to clipboard
                const codeText = this.dom.message.code.innerText;
                navigator.clipboard.writeText(codeText).then(() => {
                    this.dom.message.code.classList.add("copyed");
                }).catch((error) => {
                    console.error("Failed to copy code: ", error);
                });
            });  
        }



        //  --- button ---

        if (config.cancel||config.confirm) {
            // Create the buttons container
            this.dom.message.buttonsContainer = this.createAndAppendElement(this.dom.message.box, "div", {
                class: "imgnote-fullscreen-message-buttons-container"
            });
        }

        // Create the cancel button
        if (config.cancel) {
            this.dom.message.cancelButton = this.createAndAppendElement(this.dom.message.buttonsContainer, "button", {
                class: "imgnote-fullscreen-message-button imgnote-cancel-button",
                innerText: config.cancelText || "Cancel"
            });
            if(config.cancelColor){
                this.dom.message.cancelButton.style.backgroundColor = config.cancelColor;
            }
        }

        // Create the confirm button
        if (config.confirm) {
            this.dom.message.confirmButton = this.createAndAppendElement(this.dom.message.buttonsContainer, "button", {
                class: "imgnote-fullscreen-message-button imgnote-confirm-button",
                innerText: config.confirmText || "Confirm"
            });
            if(config.confirmColor){
                this.dom.message.confirmButton.style.backgroundColor = config.confirmColor;
            }
        }

        if(config.close){
            // Create the close button
            this.dom.message.closeButton = this.createAndAppendElement(this.dom.message.text, "button", {
                class: "imgnote-fullscreen-message-close-button",
                innerText: "×"
            });
        }

        // Set focus to the default button
        if(config.defaultButton){
            if (config.defaultButton === "confirm" && this.dom.message.confirmButton) {
                this.dom.message.confirmButton.focus();
            } else if (config.defaultButton === "cancel" && this.dom.message.cancelButton) {
                this.dom.message.cancelButton.focus();
            }
        }

        // Event listeners for buttons
        if (config.confirm) {
            this.dom.message.confirmButton.addEventListener("click", () => {
                // Handle confirm button click
                this.closeFullScreenMessage();
                if (config.confirmEventListener) config.confirmEventListener();
            });
        }
        if (config.cancel) {
            this.dom.message.cancelButton.addEventListener("click", () => {
                // Handle cancel button click
                this.closeFullScreenMessage();
                if (config.cancelEventListener) config.cancelEventListener();
            });
        }
        if(config.close){
            this.dom.message.closeButton.addEventListener("click", () => {
                // Handle close button click
                this.closeFullScreenMessage();
                if (config.closeEventListener) config.closeEventListener();
            });
        }
        this.fullscreenMessage = true;
    }

    closeFullScreenMessage() {
        // Remove message elements
        if (this.dom.message.container) {
            this.dom.message.container.remove();
        }
        if (this.dom.blurContainer) {
            this.dom.blurContainer.remove();
        }
        this.dom.message = {};
        this.fullscreenMessage = false;
    }

    // ---
    img2base64(imageUrl, callback) {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.onload = function() {
            var canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            var ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            var base64Data = canvas.toDataURL('image/jpeg'); // 可根据需要修改格式
            callback(base64Data);
        };
        img.src = imageUrl;
    }

    md5(v) {
        function M(d) { for (var _, m = "0123456789ABCDEF", f = "", r = 0; r < d.length; r++) _ = d.charCodeAt(r), f += m.charAt(_ >>> 4 & 15) + m.charAt(15 & _); return f }
        function X(d) { for (var _ = Array(d.length >> 2), m = 0; m < _.length; m++) _[m] = 0; for (m = 0; m < 8 * d.length; m += 8) _[m >> 5] |= (255 & d.charCodeAt(m / 8)) << m % 32; return _ }
        function V(d) { for (var _ = "", m = 0; m < 32 * d.length; m += 8) _ += String.fromCharCode(d[m >> 5] >>> m % 32 & 255); return _ }
        function Y(d, _) { d[_ >> 5] |= 128 << _ % 32, d[14 + (_ + 64 >>> 9 << 4)] = _; for (var m = 1732584193, f = -271733879, r = -1732584194, i = 271733878, n = 0; n < d.length; n += 16) { var h = m,g = f,t = r,a = i;f = md5_ii(f = md5_ii(f = md5_ii(f = md5_ii(f = md5_hh(f = md5_hh(f = md5_hh(f = md5_hh(f = md5_gg(f = md5_gg(f = md5_gg(f = md5_gg(f = md5_ff(f = md5_ff(f = md5_ff(f = md5_ff(f, r = md5_ff(r, i = md5_ff(i, m = md5_ff(m, f, r, i, d[n + 0], 7, -680876936), f, r, d[n + 1], 12, -389564586), m, f, d[n + 2], 17, 606105819), i, m, d[n + 3], 22, -1044525330), r = md5_ff(r, i = md5_ff(i, m = md5_ff(m, f, r, i, d[n + 4], 7, -176418897), f, r, d[n + 5], 12, 1200080426), m, f, d[n + 6], 17, -1473231341), i, m, d[n + 7], 22, -45705983), r = md5_ff(r, i = md5_ff(i, m = md5_ff(m, f, r, i, d[n + 8], 7, 1770035416), f, r, d[n + 9], 12, -1958414417), m, f, d[n + 10], 17, -42063), i, m, d[n + 11], 22, -1990404162), r = md5_ff(r, i = md5_ff(i, m = md5_ff(m, f, r, i, d[n + 12], 7, 1804603682), f, r, d[n + 13], 12, -40341101), m, f, d[n + 14], 17, -1502002290), i, m, d[n + 15], 22, 1236535329), r = md5_gg(r, i = md5_gg(i, m = md5_gg(m, f, r, i, d[n + 1], 5, -165796510), f, r, d[n + 6], 9, -1069501632), m, f, d[n + 11], 14, 643717713), i, m, d[n + 0], 20, -373897302), r = md5_gg(r, i = md5_gg(i, m = md5_gg(m, f, r, i, d[n + 5], 5, -701558691), f, r, d[n + 10], 9, 38016083), m, f, d[n + 15], 14, -660478335), i, m, d[n + 4], 20, -405537848), r = md5_gg(r, i = md5_gg(i, m = md5_gg(m, f, r, i, d[n + 9], 5, 568446438), f, r, d[n + 14], 9, -1019803690), m, f, d[n + 3], 14, -187363961), i, m, d[n + 8], 20, 1163531501), r = md5_gg(r, i = md5_gg(i, m = md5_gg(m, f, r, i, d[n + 13], 5, -1444681467), f, r, d[n + 2], 9, -51403784), m, f, d[n + 7], 14, 1735328473), i, m, d[n + 12], 20, -1926607734), r = md5_hh(r, i = md5_hh(i, m = md5_hh(m, f, r, i, d[n + 5], 4, -378558), f, r, d[n + 8], 11, -2022574463), m, f, d[n + 11], 16, 1839030562), i, m, d[n + 14], 23, -35309556), r = md5_hh(r, i = md5_hh(i, m = md5_hh(m, f, r, i, d[n + 1], 4, -1530992060), f, r, d[n + 4], 11, 1272893353), m, f, d[n + 7], 16, -155497632), i, m, d[n + 10], 23, -1094730640), r = md5_hh(r, i = md5_hh(i, m = md5_hh(m, f, r, i, d[n + 13], 4, 681279174), f, r, d[n + 0], 11, -358537222), m, f, d[n + 3], 16, -722521979), i, m, d[n + 6], 23, 76029189), r = md5_hh(r, i = md5_hh(i, m = md5_hh(m, f, r, i, d[n + 9], 4, -640364487), f, r, d[n + 12], 11, -421815835), m, f, d[n + 15], 16, 530742520), i, m, d[n + 2], 23, -995338651), r = md5_ii(r, i = md5_ii(i, m = md5_ii(m, f, r, i, d[n + 0], 6, -198630844), f, r, d[n + 7], 10, 1126891415), m, f, d[n + 14], 15, -1416354905), i, m, d[n + 5], 21, -57434055), r = md5_ii(r, i = md5_ii(i, m = md5_ii(m, f, r, i, d[n + 12], 6, 1700485571), f, r, d[n + 3], 10, -1894986606), m, f, d[n + 10], 15, -1051523), i, m, d[n + 1], 21, -2054922799), r = md5_ii(r, i = md5_ii(i, m = md5_ii(m, f, r, i, d[n + 8], 6, 1873313359), f, r, d[n + 15], 10, -30611744), m, f, d[n + 6], 15, -1560198380), i, m, d[n + 13], 21, 1309151649), r = md5_ii(r, i = md5_ii(i, m = md5_ii(m, f, r, i, d[n + 4], 6, -145523070), f, r, d[n + 11], 10, -1120210379), m, f, d[n + 2], 15, 718787259), i, m, d[n + 9], 21, -343485551), m = safe_add(m, h), f = safe_add(f, g), r = safe_add(r, t), i = safe_add(i, a) } return Array(m, f, r, i) }
        function md5_cmn(d, _, m, f, r, i) { return safe_add(bit_rol(safe_add(safe_add(_, d), safe_add(f, i)), r), m) }
        function md5_ff(d, _, m, f, r, i, n) { return md5_cmn(_ & m | ~_ & f, d, _, r, i, n) }
        function md5_gg(d, _, m, f, r, i, n) { return md5_cmn(_ & f | m & ~f, d, _, r, i, n) }
        function md5_hh(d, _, m, f, r, i, n) { return md5_cmn(_ ^ m ^ f, d, _, r, i, n) }
        function md5_ii(d, _, m, f, r, i, n) { return md5_cmn(m ^ (_ | ~f), d, _, r, i, n) }
        function safe_add(d, _) { var m = (65535 & d) + (65535 & _); return (d >> 16) + (_ >> 16) + (m >> 16) << 16 | 65535 & m }
        function bit_rol(d, _) { return d << _ | d >>> 32 - _ }
        return M(V(Y(X(v), 8 * v.length))).toLowerCase();
    }

}
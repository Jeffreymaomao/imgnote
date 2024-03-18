window.addEventListener("load", (e) => {
    const main = document.querySelector("main");
    const imgnote = new ImgNote(main);
    window.imgnote = imgnote;
    console.log(imgnote);
});

class ImgNote {
    constructor(DOMparent) {
        this.saved = true;
        this.imgURL = null;
        this.imgBase64 = this.createDefaultImgBase64(700,600);
        this.data = {
            name: 'ImgNote',
            mode: "left",
            size: 10,
            notes: []
        };
        this.size = this.data.size || 4;
        this.fullscreenMessage = false;
        this.dom = {
            root: DOMparent||document.body,
            loading: {},
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
        };

        // ---
        this.initializeMainDOM();
        const storedData = this.retrieveFromLocalStorage();
        if (storedData) {
            this.data = storedData.data;
            this.imgBase64 = storedData.imgBase64;
            this.initializeMainDOM();
        } else {
            this.loadingNewData();
        }
    }

    loadingNewData(){
        this.createLoadingDataPage()
            .then(()=>{
                this.saved = false;
                this.initializeMainDOM();
            })
            .catch(e=>{
                console.log("Cancel to import a new Data.");
            });
    }

    save(){
        const saveTime = new Date();
        const data = this.data;
        const imgBase64 = this.imgBase64;
        // ---
        const dataSet = {
            saveTime: saveTime,
            data: data,
            imgBase64: imgBase64
        }
        const hash = this.md5(JSON.stringify(this.data)+imgBase64); 
        const id = `imgnote-${hash}`
        localStorage.setItem(id, JSON.stringify(dataSet));
        this.saved = true;
    }

    initializeMainDOM() {
        if(this.dom.container){
            this.dom.container.remove();
        }
        
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

        this.dom.title = this.createAndAppendElement(this.dom.container, "div", {
            class: "imgnote-main-title show"
        });

        this.dom.titleInput = this.createAndAppendElement(this.dom.title, "input", {
            class: "imgnote-main-title-input",
            value: this.data.name
        });
        this.dom.titleInput.setAttribute('size', this.data.name.length + 2);


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
        this.dom.titleInput.addEventListener('input', this.titleInputEventListener.bind(this));

        window.addEventListener('resize', this.plotImgNote.bind(this));
        window.addEventListener('keydown', this.winowKeydownEventListener.bind(this));
        window.addEventListener('keyup', this.windowKeyupEventListener.bind(this));
        window.addEventListener('mousedown', this.windowMousedownEventListener.bind(this));
        window.addEventListener('mouseup', this.windowMouseupEventListener.bind(this));
        window.addEventListener('beforeunload', this.windowBeforeUnloadEventListener.bind(this));
        this.titleShowTemporary();
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
            } else if (code === 'KeyT') {
                e.preventDefault();
                e.stopPropagation();
                this.toogleTitle();
            }

        } else if (ctrlKey) {
            if (code === 'KeyE') {
                e.preventDefault();
                e.stopPropagation();
                this.export();
            } else if (code === 'KeyI') {
                e.preventDefault();
                e.stopPropagation();
                this.loadingNewData();
            } else if (code === 'KeyD') {
                e.preventDefault();
                e.stopPropagation();
                this.download();
            } else if (code === 'KeyS') {
                e.preventDefault();
                e.stopPropagation();
                this.save();
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

    titleInputEventListener(){
        const textLength = this.dom.titleInput.value.length;
        this.dom.titleInput.setAttribute('size', textLength + 2);
        this.data.name = this.dom.titleInput.value;
        this.saved = false;
    }

    titleShowTemporary(){
        if(!this.dom.title.classList.contains("show")) this.dom.title.classList.add("show");
        window.setTimeout(()=>{
            this.dom.title.classList.remove("show");
        }, 2000);
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
                this.closeFullScreenMessage();
            },
            cancelEventListener: ()=>{
                console.log("Delete cancel!")
                this.closeFullScreenMessage();
            }
        });
    }

    // ---
    toogleTitle(){
        this.dom.title.classList.toggle("show");
    }


    createLoadingDataPage() {
        this.dom.loading.container = this.createAndAppendElement(null, 'div', {
            class: 'imgnote-loading-container'
        });
        this.dom.loading.imgContainer = this.createAndAppendElement(this.dom.loading.container, 'div', {
            class: 'imgnote-loading-img-container'
        });

        // 圖片拖放區域
        this.dom.loading.imgDropArea = this.createAndAppendElement(this.dom.loading.imgContainer, 'div', {
            class: 'imgnote-loading-img-input'
        });

        this.dom.loading.imgText = this.createAndAppendElement(this.dom.loading.imgDropArea, 'div', {
            class: 'imgnote-loading-img-text',
            textContent: 'Drop an image here or click to select'
        });

        this.dom.loading.imgPreview = this.createAndAppendElement(this.dom.loading.imgDropArea, 'img', {
            class: 'imgnote-loading-img-preview'
        });

        // 圖片輸入
        this.dom.loading.imgInput = this.createAndAppendElement(this.dom.loading.imgDropArea, 'input', {
            type: 'file',
            accept: 'image/*',
            style: 'display: none;'
        });

        // 點擊選擇圖片的標籤觸發文件輸入
        this.dom.loading.imgDropArea.addEventListener('click', () => {
            this.dom.loading.imgInput.click();
        });
        this.dom.loading.imgDropArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.dom.loading.imgDropArea.classList.add("dragover")
        });
        this.dom.loading.imgDropArea.addEventListener('dragleave', (e) => {
            e.preventDefault();
            this.dom.loading.imgDropArea.classList.remove("dragover")
        });

        // ---

        // 右側數據輸入區域
        this.dom.loading.dataContainer = this.createAndAppendElement(this.dom.loading.container, 'div', {
            class: 'imgnote-loading-data-container'
        });

        // 文字輸入框
        this.dom.loading.dataTextArea = this.createAndAppendElement(this.dom.loading.dataContainer, 'textarea', {
            class: 'imgnote-loading-data-text',
            placeholder: 'Enter JSON data here...'
        });

        this.dom.loading.dataInput = this.createAndAppendElement(this.dom.loading.dataContainer, 'input', {
            id: 'dataInput',
            type: 'file',
            accept: '.json',
            style: 'display: none;' // Hide the input element
        });

        this.dom.loading.dataOpenFileButton = this.createAndAppendElement(this.dom.loading.dataContainer, "button", {
            class: 'imgnote-loading-data-open-file',
        });

        this.dom.loading.dataOpenFileButton.addEventListener("click",(e)=>{
            this.dom.loading.dataInput.click();
        });
        this.dom.loading.dataTextArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.dom.loading.dataTextArea.classList.add("dragover");
        });
        this.dom.loading.dataTextArea.addEventListener('dragleave', (e) => {
            e.preventDefault();
            this.dom.loading.dataTextArea.classList.remove("dragover");
        });

        // ---
        return new Promise((resolve,reject)=>{
            const messageDomItems = this.displayFullScreenMessage({
                close: true,
                confirm: true,
                dom: this.dom.loading.container,
                messageText: "Import Dataset",
                closeEventListener: reject
            });
            // ----
            if(messageDomItems.confirmButton) messageDomItems.confirmButton.classList.add("not-valid");
            let textInputValid = false;
            let imgInputValid = false;
            const checkIsBothImgAndTextAreValid = ()=>{
                if(!messageDomItems.confirmButton) return;
                if(textInputValid&&imgInputValid){
                    messageDomItems.confirmButton.classList.add("valid");
                    messageDomItems.confirmButton.classList.remove("not-valid");
                    return true;
                }else{
                    messageDomItems.confirmButton.classList.add("not-valid");
                    messageDomItems.confirmButton.classList.remove("valid");
                    return false;
                }
            }

            messageDomItems.confirmButton.addEventListener("click",()=>{
                 if(checkIsBothImgAndTextAreValid()){
                    resolve();
                    this.closeFullScreenMessage();
                 } else {
                    console.log("Not valid")
                 }
            });
            // ---
            // chack valid of image 
            this.dom.loading.imgPreview.addEventListener("load",(e)=>{
                this.dom.loading.imgDropArea.classList.add("loaded");
                this.dom.loading.imgPreview.classList.add("loaded");
                this.dom.loading.imgPreview.classList.remove("failed");
                imgInputValid = true;
                checkIsBothImgAndTextAreValid();
            });
            this.dom.loading.imgPreview.addEventListener("error",(e)=>{
                this.dom.loading.imgDropArea.classList.remove("loaded");
                this.dom.loading.imgPreview.classList.add("failed");
                this.dom.loading.imgPreview.classList.remove("loaded");
                imgInputValid = false;
            });
            this.dom.loading.imgDropArea.addEventListener('drop', (e) => {
                e.preventDefault();
                this.dom.loading.imgDropArea.classList.remove("dragover")
                const file = e.dataTransfer.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        const base64 = event.target.result;
                        this.imgBase64 = base64;
                        this.dom.loading.imgPreview.src = base64;
                        this.dom.loading.imgPreview.alt = file.name;
                    }
                    reader.readAsDataURL(file); // 開始讀取文件
                }
            });
            this.dom.loading.imgInput.addEventListener('change', (e) => {
                e.preventDefault();
                const file = e.target.files[0];
                this.dom.loading.imgInput.classList.remove("dragover")
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (event) => { // 使用事件對象 event
                        const base64 = event.target.result;
                        this.imgBase64 = base64;
                        this.dom.loading.imgPreview.src = base64;
                        this.dom.loading.imgPreview.alt = file.name; // 設置圖片的 alt 屬性為文件名
                        this.dom.loading.imgPreview.classList.add("loaded");
                    };
                    reader.readAsDataURL(file); // 開始讀取文件
                }
            });

            // chack valid of text 
            const checkValidOfTextInput = ()=>{
                if(this.isString2DataValid(this.dom.loading.dataTextArea.value)){
                    this.dom.loading.dataTextArea.classList.add("valid");
                    textInputValid = true;
                    this.data = JSON.parse(this.dom.loading.dataTextArea.value);
                    checkIsBothImgAndTextAreValid();
                } else {
                    this.dom.loading.dataTextArea.classList.remove("valid");
                    textInputValid = false;
                }
            }
            this.dom.loading.dataTextArea.addEventListener('drop', (e) => {
                e.preventDefault();
                this.dom.loading.dataTextArea.classList.remove("dragover");
                const file = e.dataTransfer.files[0];
                if (file&&file.name.endsWith(".json")) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        try {
                            this.dom.loading.dataTextArea.value = event.target.result;
                            checkValidOfTextInput();
                        } catch (error) {
                            console.error("Error parsing JSON:", error);
                        }
                    };
                    reader.readAsText(file);
                }
            });
            this.dom.loading.dataInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file&&file.name.endsWith(".json")) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        try {
                            this.dom.loading.dataTextArea.value = event.target.result;
                            checkValidOfTextInput();
                        } catch (error) {
                            console.error("Error parsing JSON:", error);
                        }
                    };
                    reader.readAsText(file);
                }
            });
            this.dom.loading.dataTextArea.addEventListener('input', checkValidOfTextInput);
        })
    }

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

        if(parent) parent.appendChild(element);
        return element;
    }

    retrieveFromLocalStorage() {
        // Retrieve data from localStorage based on id
        const keys = Object.keys(localStorage);
        let latestDataset = null;
        let latestSaveTime = 0;

        for (let i = 0; i < keys.length; i++) {
            const key = keys[i];
            if (key.startsWith("imgnote-")) {
                const dataset = JSON.parse(localStorage.getItem(key));
                if (dataset && new Date(dataset.saveTime) > latestSaveTime) {
                    latestDataset = dataset;
                    latestSaveTime = new Date(dataset.saveTime);
                }
            }
        }

        return latestDataset;
    }

    // ---
    displayHelp(){
       
    }

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

        if(config.dom){
            this.dom.message.box.appendChild(config.dom);
        }

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
            this.dom.message.confirmButton.addEventListener("click", config.confirmEventListener);
        }
        if (config.cancel) {
            this.dom.message.cancelButton.addEventListener("click", config.cancelEventListener);
        }
        if(config.close){
            this.dom.message.closeButton.addEventListener("click", () => {
                // Handle close button click
                this.closeFullScreenMessage();
                if (config.closeEventListener) config.closeEventListener();
            });
        }
        this.fullscreenMessage = true;
        return this.dom.message;
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

    isString2DataValid(data){
        try {
            const json = JSON.parse(data);
            if(json.name===undefined) return false;
            if(json.mode===undefined) return false;
            if(json.size===undefined) return false;
            if(json.notes===undefined) return false;
            if(!Array.isArray(json.notes)) return false;
        } catch (e) {
            return false;
        }
        return true;
    }

    createDefaultImgBase64(width, height){
        const gridSize = 25;
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.lineWidth = 1;
        ctx.fillStyle = "rgb(255,255,255)";
        ctx.strokeStyle = "rgb(0,0,0)";
        ctx.fillRect(0, 0, width, height);
        for (let x = 0; x < width; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.closePath();
            ctx.stroke();
        }
        for (let y = 0; y < height; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.closePath();
            ctx.stroke();
        }
        const base64Data = canvas.toDataURL('image/jpeg');
        return base64Data;
    }

    img2base64(imageUrl, callback) {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.onload = function() {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            const base64Data = canvas.toDataURL('image/jpeg');
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
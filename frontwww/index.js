let filedata;

elmThumbC.onchange = async function(){
    const fl = new FileReader();
    fl.onload = function(e){
        elmThumb.src = e.target.result;
    };
    fl.readAsDataURL(this.files[0]);
};

elmVideoC.onchange = async function(){
    const fl = new FileReader();
    fl.onload = function(e){
        elmVideo.src = e.target.result;
    };
    fl.readAsDataURL(this.files[0]);
};

elmFileC.onchange = async function(){
    const fl = new FileReader();
    fl.onload = function(e){
        filedata = e.target.result;
    };
    fl.readAsDataURL(this.files[0]);
};

elmGetTicket.onclick = async function(){
    fetch("ticket", {
        method:  "POST",
        headers: { "content-type": "application/json; charset=utf-8" },
        body:    JSON.stringify({
            email: elmEmail.value,
        }),
    })
    .then(async function(res){
        if(res.status === 200){
            let obj = await res.json();
            if(obj.message === "OK"){
                alert("Check your email box for the Ticket code.");
            }else{
                alert( JSON.stringify(obj) );
            }
        }else{
            alert( res.statusText );
        }
    })
    .catch(function(e){
        alert( e );
    });
};

elmSubmit.onclick = async function(){
    const orgText = elmSubmit.textContent;

    elmSubmit.disabled = true;
    elmSubmit.textContent = "Submitting";

    let iv = setInterval(async function(){
        elmSubmit.textContent = elmSubmit.textContent + ".";
    }, 333);

    fetch("./", {
        method:  "POST",
        headers: { "content-type": "application/json; charset=utf-8" },
        body:    JSON.stringify({
            email: elmEmail.value,
            ticket: elmTicket.value,
            name: elmName.value,
            age:  elmAge.value,
            class: elmClass.value,
            title: elmTitle.value,
            pr:    elmPR.value,
            thumb: elmThumb.src,
            video: elmVideo.src,
            file:  filedata,
        }),
    })
    .then(async function(res){
        if(res.status === 200){
            let obj = await res.json();
            if(obj.message === "OK"){
                clearInterval(iv);
                elmSubmit.textContent = "Succeeded";
                alert("Thank you! Make a note of the inquiry code '" + obj.code + "' for this works.");
            }else{
                alert( JSON.stringify(obj) );
                clearInterval(iv);
                elmSubmit.disabled = false;
                elmSubmit.textContent = orgText;
            }
        }else{
            alert( res.statusText );
            clearInterval(iv);
            elmSubmit.disabled = false;
            elmSubmit.textContent = orgText;
        }
    })
    .catch(function(e){
        alert( e );
        clearInterval(iv);
        elmSubmit.disabled = false;
        elmSubmit.textContent = orgText;
    });
};

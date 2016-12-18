
ReactDOM.render (
    <div>
        <h1 className="text-center">Custom translation</h1>
        <br/>
        <WehTranslation/>
    </div>,
    document.getElementById('root')
)

weh.setPageTitle(weh._("translation"));

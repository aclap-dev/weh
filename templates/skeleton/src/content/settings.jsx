
function Prefs() {
    return (
        <WehParams>
            <WehVersion/>
            <WehParamSet wehPrefs={["myparam_string","myparam_integer","myparam_float","myparam_boolean","myparam_choice"]}>
                <WehParam/>
            </WehParamSet>
        </WehParams>
    )
}

ReactDOM.render (
    <div>
        <h1 className="text-center">{weh._("settings")}</h1>
        <br/>
        <Prefs/>
    </div>,
    document.getElementById('root')
)

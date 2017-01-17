
(function($) {

    $.fn.skelMessage = function() {
        this.each( function() {
            $(this).bind("click",function() {
                console.info("click",$(this).attr("data-skel-message"));
                var messageType = $(this).attr("data-skel-message");
                weh.post({
                    type: messageType
                });
            });
        });

    }

}(jQuery));

$(document).ready( function() {
    $("[data-skel-message]").skelMessage();
});

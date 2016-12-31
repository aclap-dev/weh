
angular.module('skeleton',[]);

angular.module('skeleton').directive('skelLink',function() {
    return {
        template: function(elem,attr) {
            return `
                <a
                    ng-click="post({type: '${attr.messagetype}' })">
                    ${attr.label}
                </a>
            `;
        }
    }
});

angular.module('skeleton').controller('SkelCtrl',['$scope',function($scope) {
    // in case you need a controller to do stuff
}]);

weh.ngBootstrap('skeleton');

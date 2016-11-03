angular.module('healthyGulpAngularApp', ['ui.router', 'healthyGulpAngularAppComponents', 'toaster'])

.config(['$stateProvider', '$urlRouterProvider',
    function($stateProvider, $urlRouterProvider) {

        $urlRouterProvider.otherwise('/');

        $stateProvider

            .state('home', {
                url: '/',
                templateUrl: 'components/home.html'
            });

    }])
    .controller('myController', function($scope, toaster) {
        $scope.pop = function() {
            toaster.pop('success', "title", "text");
        };
    });

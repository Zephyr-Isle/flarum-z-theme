<?php

use Flarum\Extend;
use Flarum\Extend\Frontend;

return [
    (new Frontend('forum'))
        ->css(__DIR__.'/resources/less/forum.less'),
    
    (new Frontend('admin'))
        ->css(__DIR__.'/resources/less/forum.less'),
];
/*
 * Copyright (c) 2012, Aleksander Zdyb All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * - Redistributions of source code must retain the above copyright notice,
 *   this list of conditions and the following disclaimer.
 *
 * - Redistributions in binary form must reproduce the above copyright notice,
 *   this list of conditions and the following disclaimer in the documentation
 *   and/or other materials provided with the distribution.
 *
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO,
 * THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
 * PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR
 * CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
 * EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
 * PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS;
 * OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
 * WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR
 * OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF
 * ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 *
 */

(function ($) {

    function onPostSuccess(data, textStatus, jqXHR) {
        var settings = this.data('djangoforms').settings;

        var updateErrorLists = true;
        if ($.isFunction(settings.success)) {
            updateErrorLists = !settings.success(data, textStatus, jqXHR);
        }

        if (updateErrorLists)
            methods.clearErrors.call(this);

        if ($.isFunction(settings.complete)) {
            settings.complete();
        }
    }

    function onPostError(jqXHR, textStatus, errorThrown) {
        var settings = this.data('djangoforms').settings;

        if (jqXHR.status == 422) {
            onValidationError.call(this, jqXHR, textStatus, errorThrown);
        } else {
            if ($.isFunction(settings.unexpectedAjaxError))
                settings.unexpectedAjaxError(jqXHR, textStatus, errorThrown);
        }

        if ($.isFunction(settings.complete))
            settings.complete(jqXHR, textStatus, errorThrown);
    }

    function onValidationError(jqXHR, textStatus, errorThrown) {
        var settings = this.data('djangoforms').settings;

        var updateErrorLists = true;
        if ($.isFunction(settings.validationError)) {
            updateErrorLists = !settings.validationError(jqXHR, textStatus, errorThrown);
        }

        if (updateErrorLists) {
            var responseJSON = $.parseJSON(jqXHR.responseText);

            this.find('input, textarea, select').each(function (i, item) {
                if (item.name in responseJSON.errors == false)
                    $(item).siblings('ul.errorlist').remove();
            });

            for (var key in responseJSON.errors) {
                var $field = this.find('[name="' + key + '"]');
                var $ul_errorlist = $field.siblings('ul.errorlist');

                if ($ul_errorlist.length == 0) {
                    $ul_errorlist = $(document.createElement('ul'));
                    $ul_errorlist.addClass('errorlist');
                } else
                    $ul_errorlist.empty();

                var errListLength = responseJSON.errors[key].length;
                for (var i = 0; i < errListLength; ++i) {
                    $ul_errorlist.append('<li>' + responseJSON.errors[key][i] + '</li>');
                }

                var as = methods.option.call(this, 'as');

                if (as == "p")
                    $field.parents('p').before($ul_errorlist);
                else if (as == "ul")
                    $field.parents('li').prepend($ul_errorlist);
                else
                    $field.before($ul_errorlist);
            }
        }
    }

    function collectData(form) {
        var formData = new FormData();

        form.find('input:not([type="file"]), textarea, select').each(function (i, item) {
            formData.append(item.name, $(item).val());
        });

        form.find('input[type="file"]').each(function (i, item) {
            var files = item.files;
            var filesCount = files.length;
            for (i = 0; i < filesCount; ++i) {
                formData.append(item.name, files[i]);
            }
        });

        return formData;
    }

    var methods = {
        init:function (options) {
            var settings = $.extend({
                as:'table', // Django's default
                errorFieldClass:'',
                errorParentClass:'',
                exclude:[],
                success:false,
                validationError:false,
                unexpectedAjaxError:false,
                complete:false
            }, options);

            return this.each(function (i, item) {
                var $this = $(item);
                var data = $this.data('djangoforms');
                if (!data) {
                    $this.data('djangoforms', {
                        settings:settings
                    });
                }
            });
        },

        destroy:function () {
            return this.each(function (i, item) {
                var $this = $(item);
                $this.removeData('djangoforms');
            });
        },

        option:function (opt, val) {
            var $this = this;
            var data = $this.data('djangoforms');
            if (data) {
                var settings = data.settings;
                if (val === undefined) {
                    return (settings[opt] === undefined) ? null : settings[opt];
                } else {
                    settings[opt] = val;
                }
            }
            return undefined;
        },

        clearErrors:function () {
            return this.each(function (i, item) {
                var $this = $(item);
                $this.find('ul.errorlist').remove();
            });
        },

        resetInputs:function () {
            return this.each(function (i, item) {
                item.reset();
            });
        },

        post:function (url) {
            var $this = this;

            if (url === undefined)
                url = methods.option.call($this, 'url');

            var formData = collectData($this);

            $.ajax({
                type:'post',
                dataType:'json',
                url:url,
                processData:false,
                contentType:false,
                data:formData,
                success:onPostSuccess,
                error:onPostError,
                context:$this
            });
        }
    };

    $.fn.djangoforms = function (method) {
        if (methods[method]) {
            return methods[ method ].apply(this, Array.prototype.slice.call(arguments, 1));
        } else if (typeof method === 'object' || !method) {
            return methods.init.apply(this, arguments);
        } else {
            $.error('Method ' + method + ' does not exist on jQuery.djangoforms');
        }
    };

})(jQuery);

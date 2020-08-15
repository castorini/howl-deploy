# Howl-deploy

This repo demonstrates how wake word detection can be easily achieved in vastly different domains using models trained with [howl](https://github.com/castorini/howl)


## Model weights

To train a new model, please refer to our python implementation [howl](https://github.com/castorini/howl)

To obtain pre-trained weight, please refer to [howl-models](https://github.com/castorini/howl-models) or simply run `git submodule update --init --recursive`


## Supported languages

* [JavaScript (In-browser)](https://github.com/castorini/howl-deploy/tree/master/JavaScript)
   - Machine learning : [Tensorflow.js](https://www.tensorflow.org/js)
   - Feature extraction : [Meyda](https://github.com/meyda/meyda) (the code has been customized)
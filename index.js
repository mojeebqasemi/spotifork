#!/usr/bin/env node
'use strict';
const got = require('got');
const meow = require('meow');
const chalk = require('chalk');
const ora = require('ora');
const inquirer = require('inquirer');
const Conf = require('conf');
const updateNotifier = require('update-notifier');
const pkg = require('./package.json');
const spinner = ora('Loading ...');

// config file stored in /Users/{home}/Library/Preferences/{project-name}
const config = new Conf();

function auth() {
  return new Promise((resolve, reject) => {
    inquirer.prompt([
        {
          type: 'input',
          message: 'Enter your Spotify username',
          name: 'username'
        },
        {
          type: 'password',
          message: 'Enter your Spotify bearer token',
          name: 'bearer'
        }
    ]).then(function (answers) {
      var answer = JSON.stringify(answers);
      config.set(answers);
      resolve(true);
    }).catch(err => reject(err));
  });
}

const spotifork = async function spotifork(inputs, flags) {

	// name of the playlist, optional parameter
	spinner.start();
	// playlist name is being reset when creating a playlist
	let playlistName = flags['n'];
	// playlist URI
	let PlaylistURI = inputs;

	if (PlaylistURI === undefined){
			spinner.fail('Failed');
			console.log(chalk.red(`
	Oops! Remember to add an artist name!

	Example

		spotifork spotify:user:kabirvirji:playlist:23v4GpUwnvSENslciz2CkC
		`))
			return
	}
	const playlistID = inputs.slice(33);
	
	var getPlaylistOptions = {
	  json: true, 
	  headers: {
	    'Content-type': 'application/json',
	    'Authorization' : `Bearer ${config.get('bearer')}`
	  }
	};

	// get playlist
	got(`https://api.spotify.com/v1/users/${config.get('username')}/playlists/${playlistID}`, getPlaylistOptions)
	  .then(response => {
	    const responseTracks = response.body.tracks.items
	    // holds playlist tracks
	    let tracks = []
	    if (playlistName == undefined){
	    	let playlistName = response.body.name;
	    }
	    for (var i=0;i<responseTracks.length;i++){
	    	tracks.push(responseTracks[i].track.uri);
	    }

		var createPlaylistOptions = {
		  json: true, 
		  headers: {
		    'Content-type': 'application/json',
		    'Authorization' : `Bearer ${config.get('bearer')}`,
		    'Accept' : 'application/json'
		  },
		  body: JSON.stringify({ description: `spotiforked from ${config.get('username')}/${playlistName}`, name: `${playlistName}`, public : true})
		};

		// create playlist
		got.post(`https://api.spotify.com/v1/users/${config.get('username')}/playlists`, createPlaylistOptions)
		  .then(response => {
		  	// playlist ID
		    const newPlaylistID = response.body.id;

				// function to add tracks to playlist
				function populatePlaylist (id, uris) {
					var url = `https://api.spotify.com/v1/users/${config.get('username')}/playlists/${id}/tracks?uris=${uris}`
					var options = {
					  json: true, 
					  headers: {
					    'Content-type': 'application/json',
					    'Authorization' : `Bearer ${config.get('bearer')}`,
					  }
					};
					got.post(url, options)
					  .then(response => {
					  	spinner.succeed('Success!');
					    console.log(chalk.green(`
	Your playlist is ready! 
	It's called "${playlistName}"`));
					  })
					  .catch(err => { 
					  	spinner.fail('Failed');
					  	// don't need to reset config since credentials are correct at this point
					  	console.log(chalk.red(`
	There was an error adding songs to the playlist. 

	However, a playlist was created. 

	Please try a different search.`)); 
					  });
				}

				populatePlaylist(newPlaylistID, tracks);

		  
		  })
	})



	  .catch(async err => { 
	  	spinner.fail('Failed');
	  	config.clear();
	  	console.log(chalk.red(`
	ERROR: Incorrect username or bearer token

	You might need to update your bearer token

	Generate a new one at https://developer.spotify.com/web-api/console/post-playlists/

	Try again!
	  $ spotifork <playlist uri>`));

	  });

	// error checks after post requests indicate invalid bearer tokens

	// cause use webpage auth to regenerate tokens


}

spinner.stop();

const cli = meow(chalk.cyan(`
    Usage
      $ spotifork <playlist URI>
      ? Enter your Spotify username <username>
      ? Enter your Spotify bearer token <bearer>
    Options
      --name [-n] "playlist name"
    Example
      $ spotifork spotify:user:kabirvirji:playlist:23v4GpUwnvSENslciz2CkC
      ? Enter your Spotify username kabirvirji
      ? Enter your Spotify bearer token ************************************************************
    For more information visit https://github.com/kabirvirji/spotifork
`), {
    alias: {
        n: 'name'
    }
}
);


updateNotifier({pkg}).notify();

(async () => {

if (config.get('username') === undefined || config.get('bearer') === undefined) {
	let authorization = await auth();
}
spotifork(cli.input[0], cli.flags);

})()
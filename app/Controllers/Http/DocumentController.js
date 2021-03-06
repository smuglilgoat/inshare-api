'use strict';
const Document = use('App/Models/Document');
const Video = use('App/Models/Video');
const Tag = use('App/Models/Tag');
const Database = use('Database');
var intersection = require('lodash.intersection');
var min = require('lodash.min');

class DocumentController {
	async index({ auth, response }) {
		try {
			const authUser = auth.current.user;

			if (authUser.role != 'Administrateur' && authUser.role != 'Moderateur') {
				return response.status(401).json({
					status: 'error',
					message: 'Accès interdit.'
				});
			}

			const docs = await Document.all();
			response.status(200).json({ docs });
		} catch (error) {
			console.log(error);
			return response.status(404).json({
				status: 'error',
				message: "Nous n'avons pas pu recuperer les documents."
			});
		}
	}

	async create({ request, auth, params, response }) {
		try {
			const user = auth.current.user;

			switch (params.type) {
				case 'image':
					console.log('# Document Upload (' + params.type + ')');

					const files = request.file('file', {
						types: [ 'image' ],
						size: '5mb'
					});
					if (files._files) {
						const document = await user.document().create({ user_id: user.id, type: 'Image' });
						try {
							await files.moveAll(
								'G:\\Documents\\Code\\Web\\pfe\\pfe-api\\app\\Files\\Documents\\' + document.id + '\\',
								async function processFiles(file) {
									try {
										await document.image().create({
											document_id: document.id,
											name: file.clientName,
											path:
												'http://127.0.0.1:3333/documents/' +
												document.id +
												'/images/' +
												file.clientName
										});
										return {
											name: '' + file.clientName
										};
									} catch (error) {
										console.log(error);
										return response.status(500).json({
											status: 'error',
											message: "Nous n'avons pas pu stocker l'image."
										});
									}
								}
							);
							const fs = require('fs');
							const archiver = require('archiver');

							// create a file to stream archive data to.
							var output = fs.createWriteStream(
								'G:\\Documents\\Code\\Web\\pfe\\pfe-api\\app\\Files\\Downloads\\' + document.id + '.zip'
							);
							var archive = archiver('zip');

							// pipe archive data to the file
							archive.pipe(output);

							// append files from a sub-directory, putting its contents at the root of archive
							archive.directory(
								'G:\\Documents\\Code\\Web\\pfe\\pfe-api\\app\\Files\\Documents\\' + document.id,
								false
							);

							// finalize the archive (ie we are done appending files but streams have to finish yet)
							// 'close', 'end' or 'finish' may be fired right after calling this method so register to them beforehand
							archive.finalize();
							response.status(201).json({ document });
						} catch (error) {
							console.log(error);
						}
					} else {
						const document = await user.document().create({ user_id: user.id, type: 'Image' });
						await document.image().create({
							document_id: document.id,
							name: files.clientName,
							path: 'http://127.0.0.1:3333/documents/' + document.id + '/images/' + files.clientName
						});
						try {
							await files.move(
								'G:\\Documents\\Code\\Web\\pfe\\pfe-api\\app\\Files\\Documents\\' + document.id + '\\',
								{
									name: files.clientName,
									overwrite: true
								}
							);
							const fs = require('fs');
							const archiver = require('archiver');

							// create a file to stream archive data to.
							var output = fs.createWriteStream(
								'G:\\Documents\\Code\\Web\\pfe\\pfe-api\\app\\Files\\Downloads\\' + document.id + '.zip'
							);
							var archive = archiver('zip');

							// pipe archive data to the file
							archive.pipe(output);

							// append files from a sub-directory, putting its contents at the root of archive
							archive.directory(
								'G:\\Documents\\Code\\Web\\pfe\\pfe-api\\app\\Files\\Documents\\' + document.id,
								false
							);

							// finalize the archive (ie we are done appending files but streams have to finish yet)
							// 'close', 'end' or 'finish' may be fired right after calling this method so register to them beforehand
							archive.finalize();
							response.status(201).json({ document });
						} catch (error) {
							console.log(error);
						}
					}
					break;
				case 'video':
					const document = await Document.create({ user_id: user.id, type: 'Video' });
					const video = await Video.create({
						document_id: document.id,
						provider: request.input('provider'),
						link: request.input('link')
					});
					response.status(201).json({ document });
					break;
				case 'doc':
					console.log('# Document Upload (' + params.type + ')');

					const dfiles = request.file('file', {
						size: '24mb',
						extnames: [ 'pdf', 'doc', 'docx', 'ppt', 'pptx' ]
					});

					const ddocument = await user.document().create({ user_id: user.id, type: 'Doc' });
					await ddocument.doc().create({
						document_id: ddocument.id,
						name: dfiles.clientName.replace(/ /g, ''),
						path:
							'http://127.0.0.1:3333/documents/' +
							ddocument.id +
							'/doc/' +
							dfiles.clientName.replace(/ /g, '')
					});
					try {
						await dfiles.move(
							'G:\\Documents\\Code\\Web\\pfe\\pfe-api\\app\\Files\\Documents\\' + ddocument.id + '\\',
							{
								name: dfiles.clientName.replace(/ /g, ''),
								overwrite: true
							}
						);

						if (!dfiles.moved()) {
							console.log(dfiles.error());
						}

						const fs = require('fs');
						const archiver = require('archiver');

						// create a file to stream archive data to.
						var output = fs.createWriteStream(
							'G:\\Documents\\Code\\Web\\pfe\\pfe-api\\app\\Files\\Downloads\\' + ddocument.id + '.zip'
						);
						var archive = archiver('zip');

						// pipe archive data to the file
						archive.pipe(output);

						// append files from a sub-directory, putting its contents at the root of archive
						archive.directory(
							'G:\\Documents\\Code\\Web\\pfe\\pfe-api\\app\\Files\\Documents\\' + ddocument.id,
							false
						);

						// finalize the archive (ie we are done appending files but streams have to finish yet)
						// 'close', 'end' or 'finish' may be fired right after calling this method so register to them beforehand
						archive.finalize();
						response.status(201).json({ ddocument });
					} catch (error) {
						console.log(error);
					}
					break;
				default:
					break;
			}
		} catch (error) {
			console.log(error);
			return response.status(500).json({
				status: 'error',
				message: "Nous n'avons pas pu enregistrer votre fichier."
			});
		}
	}

	async show({ params, response }) {
		try {
			const document = await Document.query().where('id', params.id).firstOrFail();
			document.vues++;
			document.save();
			response.status(200).json({ document });
		} catch (error) {
			console.log(error);
			return response.status(500).json({
				status: 'error',
				message: "Nous n'avons pas pu recuperer le document."
			});
		}
	}

	async queryTags({ request, response }) {
		try {
			let tags = JSON.parse(request.input('tags'));
			console.log('# Document Query (' + tags.length + ') = ' + tags);
			let docs = new Array();
			for (let index = 0; index < tags.length; index++) {
				const d = await Database.raw(
					'select * from documents where match(tags) AGAINST (? IN NATURAL LANGUAGE MODE)',
					[ tags[index] ]
				);
				docs.push(d[0]);
			}
			const result = min(intersection(docs));
			response.status(200).json({ result });
		} catch (error) {
			console.log(error);
			return response.status(404).json({
				status: 'error',
				message: "Nous n'avons pas pu recuperer les documents."
			});
		}
	}

	async queryCategory({ params, response }) {
		try {
			console.log('# Document Query = ' + params.category);

			const docs = await Document.query().where('categorie', params.category).whereNot('public', 0).fetch();

			response.status(200).json({ docs });
		} catch (error) {
			console.log(error);
			return response.status(404).json({
				status: 'error',
				message: "Nous n'avons pas pu recuperer les documents."
			});
		}
	}

	async queryUser({ params, response }) {
		try {
			const docs = await Document.query().where('user_id', params.id).fetch();
			response.status(200).json({ docs });
		} catch (error) {
			console.log(error);
			return response.status(404).json({
				status: 'error',
				message: "Nous n'avons pas pu recuperer les documents."
			});
		}
	}

	async update({ request, params, auth, response }) {
		try {
			const authUser = auth.current.user;
			const doc = await Document.query().where('id', params.id).firstOrFail();

			if (authUser.role != 'Administrateur' && authUser.role != 'Moderateur' && authUser.id != doc.user_id) {
				return response.status(401).json({
					status: 'error',
					message: 'Accès interdit.'
				});
			}

			doc.public = request.input('public');
			doc.titre = request.input('titre');
			doc.description = request.input('description');
			doc.langue = request.input('langue');
			doc.domaine = request.input('domaine');

			if (request.input('categorie')) {
				doc.categorie = request.input('categorie');
			}
			if (request.input('tags')) {
				if (request.input('tags').length != 0) {
					let tags = request.input('tags');
					let tagsText = new String();
					tags.forEach((tag) => {
						tag = tag.toLowerCase();
						tagsText = tagsText + tag + ' ';
						(async function() {
							await Tag.findOrCreate({ nom: tag }, { nom: tag });
						})();
					});
					doc.tags = tagsText.slice(0, -1);
				}
			}

			await doc.save();
			response.status(200);
		} catch (error) {
			console.log(error);
			return response.status(500).json({
				status: 'error',
				message: "Nous n'avons pas pu mettre à jour le document."
			});
		}
	}

	async delete({ params, auth, response }) {
		try {
			const authUser = auth.current.user;
			const doc = await Document.query().where('id', params.id).firstOrFail();

			if (authUser.role != 'Administrateur' && authUser.role != 'Moderateur' && authUser.id != doc.user_id) {
				return response.status(401).json({
					status: 'error',
					message: 'Accès interdit.'
				});
			}
			await doc.image().delete();
			await Document.query().where('id', params.id).delete();
			response.status(204);
		} catch (error) {
			console.log(error);
			return response.status(500).json({
				status: 'error',
				message: "Nous n'avons pas pu supprimer le document."
			});
		}
	}
}

module.exports = DocumentController;

const TriggerHelper = require('./triggerHelper');
const Form = require('../entities/form');
const Contact = require('../entities/contact');
const triggerType = 'mautic.form_on_submit';
const triggerHelper = new TriggerHelper(triggerType, 'Trigger Zapier about form submit events');

const cleanSubmission = (dirtySubmission) => {
  var submission = {};

  if (dirtySubmission.submission) {
    dirtySubmission = dirtySubmission.submission;
  }

  submission.id = dirtySubmission.id;
  submission.dateSubmitted = dirtySubmission.dateSubmitted;
  submission.referrer = dirtySubmission.referer;
  submission.page = dirtySubmission.page;
  submission.results = dirtySubmission.results;

  if (dirtySubmission.ipAddress && dirtySubmission.ipAddress.ip) {
    submission.ip = dirtySubmission.ipAddress.ip;
  } else {
    submission.ip = null;
  }

  if (dirtySubmission.lead) {
    var contact = new Contact();
    submission.contact = contact.cleanContact(dirtySubmission.lead);
  }

  if (dirtySubmission.form) {
    submission.formId = dirtySubmission.form.id;
    submission.formName = dirtySubmission.form.name;
    submission.formAlias = dirtySubmission.form.alias;
  }

  return submission;
};

const cleanSubmissions = (dirtySubmissions) => {
  const submissions = [];

  for (var key in dirtySubmissions) {
    submissions.push(cleanSubmission(dirtySubmissions[key]));
  };

  return submissions;
};

const getSubmission = (z, bundle) => {
  const dirtySubmissions = bundle.cleanedRequest[triggerType];
  return cleanSubmissions(dirtySubmissions);
};

const guessFieldValue = (field) => {
  if (field.defaultValue) {
    return field.defaultValue;
  } else if (field.type === 'email') {
    return 'sample@email.com';
  }

  return 'sample_text';
}

const fakeSubmissionObjectFromForm = (form, contact) => {
  var results = {};

  if (form.fields) {
    for (var i in form.fields) {
      var field = form.fields[i];
      if (field.type === 'button') {
        continue;
      }
      results[field.alias] = guessFieldValue(field);
    }
  }

  var submission = {
    id: 3,
    ipAddress: {ip: '127.0.0.1'},
    dateSubmitted: form.dateModified,
    referer: 'http://sample.com/',
    page: null,
    form: form,
    results: results,
    lead: contact,
  };

  return submission;
};

const performList = (z, bundle) => {
  const form = new Form(z, bundle);
  const contact = new Contact(z, bundle);

  return form.getItem(bundle.inputData.formId).then((fetchedForm) => {
    return contact.getList({limit: 1, search: '!is:anonymous'}).then((contacts) => {
      var fetchedContact = null;
      for (var i in contacts) {
        fetchedContact = contacts[i];
      }
      return cleanSubmissions([fakeSubmissionObjectFromForm(fetchedForm, fetchedContact)]);
    });
  });
};

module.exports = {
  key: 'formSubmitted',
  noun: 'Form',
  display: {
    label: 'Submitted Form',
    description: 'Trigger when a new form submission is created.'
  },
  operation: {
    type: 'hook',
    inputFields: [
      {key: 'formId', type: 'integer', label: 'Form ID', dynamic: 'forms.id.name', helpText: 'Select the form for the submission trigger'},
    ],
    performSubscribe: triggerHelper.subscribeHook,
    performUnsubscribe: triggerHelper.unsubscribeHook,
    perform: getSubmission,
    performList: performList,
    sample: require('../fixtures/formSubmitted.js'),
  }
};

import React, { useEffect, useState } from 'react';
import OnstoodWordmark from '../OnstoodWordmark';
import { BriefcaseBusiness, ChevronRight, FileText, Plus, Search, Users } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { fmtDate } from '../../utils/formatters';
import { Page } from '../ui';

export default function Career({
  profile,
  notify
}) {

  const isEmployer =
    profile.account_type === 'employer';

  const [opportunities, setOpportunities] =
    useState([]);

  const [applications, setApplications] =
    useState([]);

  const [applicants, setApplicants] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [q, setQ] =
    useState('');

  const [type, setType] =
    useState('all');

  const [countryFilter, setCountryFilter] =
    useState('all');

  const [cityFilter, setCityFilter] =
    useState('all');

  const [workplaceFilter, setWorkplaceFilter] =
    useState('all');

  const [applyTo, setApplyTo] =
    useState(null);

  const [coverNote, setCoverNote] =
    useState('');

  const [showPublisher, setShowPublisher] =
    useState(false);

  const [publishing, setPublishing] =
    useState(false);

  const [jobForm, setJobForm] =
    useState({
      title: '',
      opportunity_type: 'internship',
      workplace: 'onsite',
      country: '',
      city: '',
      remote_scope: 'local',
      description: '',
      application_url: '',
      expires_at: ''
    });


  async function loadCareer() {

    setLoading(true);


  if (isEmployer) {

      const [
        jobsResult,
        applicationsResult
      ] = await Promise.all([

        supabase
          .from('career_opportunities')
          .select('*')
          .eq(
            'created_by',
            profile.id
          )
          .order(
            'created_at',
            {
              ascending: false
            }
          ),

        supabase
          .from('job_applications')
          .select('*')
          .order(
            'applied_at',
            {
              ascending: false
            }
          )

      ]);


      if (jobsResult.error) {
        notify(jobsResult.error.message);
      }

      if (applicationsResult.error) {
        notify(applicationsResult.error.message);
      }


      const jobs =
        jobsResult.data || [];

      const jobIds =
        new Set(
          jobs.map(item =>
            item.id
          )
        );


      const ownApplications =
        (applicationsResult.data || [])
          .filter(item =>
            jobIds.has(
              item.opportunity_id
            )
          );


      const applicantIds =
        [
          ...new Set(
            ownApplications.map(item =>
              item.applicant_id
            )
          )
        ];


      let profilesData = [];


      if (applicantIds.length) {

        const {
          data,
          error
        } = await supabase
          .from('profiles')
          .select(`
            id,
            name,
            surname,
            university,
            degree,
            city,
            avatar_url
          `)
          .in(
            'id',
            applicantIds
          );


        if (error) {
          notify(error.message);
        } else {
          profilesData =
            data || [];
        }

      }


      const profileById =
        new Map(
          profilesData.map(item => [
            item.id,
            item
          ])
        );


      setOpportunities(jobs);

      setApplicants(
        ownApplications.map(item => ({
          ...item,
          applicant:
            profileById.get(
              item.applicant_id
            ) || null,
          opportunity:
            jobs.find(job =>
              job.id ===
              item.opportunity_id
            ) || null
        }))
      );


      setApplications([]);

    } else {

      const [
        jobsResult,
        applicationsResult
      ] = await Promise.all([

        supabase
          .from('career_opportunities')
          .select('*')
          .eq(
            'status',
            'published'
          )
          .order(
            'published_at',
            {
              ascending: false
            }
          ),

        supabase
          .from('job_applications')
          .select('*')
          .eq(
            'applicant_id',
            profile.id
          )
          .order(
            'applied_at',
            {
              ascending: false
            }
          )

      ]);


      if (jobsResult.error) {
        notify(jobsResult.error.message);
      }

      if (applicationsResult.error) {
        notify(applicationsResult.error.message);
      }


      setOpportunities(
        jobsResult.data || []
      );

      setApplications(
        applicationsResult.data || []
      );

      setApplicants([]);

    }


    setLoading(false);

  }


  useEffect(() => {
    loadCareer();
  }, [
    profile.id,
    isEmployer
  ]);


  const countries =
    [
      ...new Set(
        opportunities
          .map(item => item.country)
          .filter(Boolean)
      )
    ].sort();


  const cities =
    [
      ...new Set(
        opportunities
          .filter(item =>
            countryFilter === 'all' ||
            item.country === countryFilter
          )
          .map(item => item.city)
          .filter(Boolean)
      )
    ].sort();


  const filtered =
    opportunities.filter(item => {

      if (
        !isEmployer &&
        type !== 'all' &&
        item.opportunity_type !== type
      ) {
        return false;
      }


      if (
        !isEmployer &&
        countryFilter !== 'all' &&
        (item.country || '') !== countryFilter
      ) {
        return false;
      }


      if (
        !isEmployer &&
        cityFilter !== 'all' &&
        (item.city || '') !== cityFilter
      ) {
        return false;
      }


      if (
        !isEmployer &&
        workplaceFilter !== 'all' &&
        (item.workplace || '') !== workplaceFilter
      ) {
        return false;
      }


      const text =
        `
        ${item.title || ''}
        ${item.organization || ''}
        ${item.country || ''}
        ${item.city || ''}
        ${item.location || ''}
        ${item.description || ''}
        ${item.workplace || ''}
        `.toLowerCase();


      return text.includes(
        q.trim().toLowerCase()
      );

    });


  async function publishOpportunity(
    event
  ) {

    event.preventDefault();


    if (!isEmployer) {
      return;
    }


    if (
      !jobForm.title.trim() ||
      !jobForm.description.trim()
    ) {
      return;
    }


    setPublishing(true);


    const {
      data,
      error
    } = await supabase
      .from('career_opportunities')
      .insert({
        created_by:
          profile.id,
        title:
          jobForm.title.trim(),
        organization:
          profile.company_name ||
          `${profile.name || ''} ${profile.surname || ''}`.trim() ||
          'Employer',
        opportunity_type:
          jobForm.opportunity_type,
        workplace:
          jobForm.workplace,
        country:
          jobForm.country.trim(),
        city:
          jobForm.city.trim(),
        location:
          [
            jobForm.city.trim(),
            jobForm.country.trim()
          ].filter(Boolean).join(', '),
        remote_scope:
          jobForm.workplace === 'remote'
            ? jobForm.remote_scope
            : 'local',
        description:
          jobForm.description.trim(),
        application_url:
          jobForm.application_url.trim() ||
          null,
        status:
          'published',
        expires_at:
          jobForm.expires_at
            ? new Date(
                jobForm.expires_at
              ).toISOString()
            : null
      })
      .select()
      .single();


    if (error) {
      notify(error.message);
      setPublishing(false);
      return;
    }


    setOpportunities(current => [
      data,
      ...current
    ]);


    setJobForm({
      title: '',
      opportunity_type: 'internship',
      workplace: 'onsite',
      country: '',
      city: '',
      remote_scope: 'local',
      description: '',
      application_url: '',
      expires_at: ''
    });

    setShowPublisher(false);
    setPublishing(false);

    notify(
      'Opportunity published.'
    );

  }


  async function apply(
    opportunity
  ) {

    const {
      data,
      error
    } = await supabase
      .from('job_applications')
      .insert({
        opportunity_id:
          opportunity.id,
        applicant_id:
          profile.id,
        cover_note:
          coverNote.trim(),
        status:
          'applied'
      })
      .select()
      .single();


    if (error) {

      notify(
        error.code === '23505'
          ? 'You already applied for this opportunity.'
          : error.message
      );

      return;
    }


    setApplications(current => [
      data,
      ...current
    ]);

    setApplyTo(null);
    setCoverNote('');

    notify(
      'Application sent.'
    );

  }


  async function updateApplicationStatus(
    application,
    status
  ) {

    const {
      data,
      error
    } = await supabase
      .from('job_applications')
      .update({
        status
      })
      .eq(
        'id',
        application.id
      )
      .select()
      .single();


    if (error) {
      notify(error.message);
      return;
    }


    setApplicants(current =>
      current.map(item =>
        item.id === data.id
          ? {
              ...item,
              status:
                data.status,
              updated_at:
                data.updated_at
            }
          : item
      )
    );


    notify(
      `Applicant moved to ${status}.`
    );

  }


  const applicationByJob =
    new Map(
      applications.map(item => [
        item.opportunity_id,
        item
      ])
    );


  if (isEmployer) {

    return (
      <Page
        eyebrow="EMPLOYER"
        title="Career Publisher"
        action={
          <button
            type="button"
            className="btn primary"
            onClick={() =>
              setShowPublisher(
                current => !current
              )
            }
          >
            <Plus size={16} />
            Publish opportunity
          </button>
        }
      >

        <div className="card career-hero">

          <div>
            <span className="eyebrow">
              {
                profile.company_name ||
                'ONSTOOD EMPLOYER'
              }
            </span>

            <h2>
              Recruit students and emerging talent.
            </h2>

            <p>
              Publish internships, graduate roles, projects and student-friendly opportunities, then manage applicants in one professional pipeline.
            </p>
          </div>

          <BriefcaseBusiness
            size={48}
          />

        </div>


        {showPublisher && (

          <form
            className="card form-card"
            onSubmit={
              publishOpportunity
            }
            style={{
              marginTop: 20
            }}
          >

            <div className="card-head">
              <div>
                <span className="eyebrow dark">
                  NEW LISTING
                </span>
                <h3>
                  Publish an opportunity
                </h3>
              </div>

              <BriefcaseBusiness
                size={19}
              />
            </div>


            <input
              name="job-title"
              placeholder="Role title"
              value={
                jobForm.title
              }
              onChange={event =>
                setJobForm(
                  current => ({
                    ...current,
                    title:
                      event.target.value
                  })
                )
              }
              required
            />


            <div className="grid2">

              <select
                name="opportunity-type"
                value={
                  jobForm.opportunity_type
                }
                onChange={event =>
                  setJobForm(
                    current => ({
                      ...current,
                      opportunity_type:
                        event.target.value
                    })
                  )
                }
              >
                <option value="internship">
                  Internship
                </option>
                <option value="part_time">
                  Part-time
                </option>
                <option value="graduate">
                  Graduate role
                </option>
                <option value="project">
                  Project
                </option>
                <option value="scholarship">
                  Scholarship
                </option>
              </select>


              <select
                name="workplace"
                value={
                  jobForm.workplace
                }
                onChange={event =>
                  setJobForm(
                    current => ({
                      ...current,
                      workplace:
                        event.target.value
                    })
                  )
                }
              >
                <option value="onsite">
                  On-site
                </option>
                <option value="hybrid">
                  Hybrid
                </option>
                <option value="remote">
                  Remote
                </option>
              </select>

            </div>


            <div className="grid2">

              <input
                name="job-country"
                placeholder="Country · e.g. Japan, Singapore, USA, Australia"
                value={
                  jobForm.country
                }
                onChange={event =>
                  setJobForm(
                    current => ({
                      ...current,
                      country:
                        event.target.value
                    })
                  )
                }
                required
              />


              <input
                name="job-city"
                placeholder="City · e.g. Tokyo, Singapore, New York, Sydney"
                value={
                  jobForm.city
                }
                onChange={event =>
                  setJobForm(
                    current => ({
                      ...current,
                      city:
                        event.target.value
                    })
                  )
                }
              />

            </div>


            {jobForm.workplace === 'remote' && (

              <label>
                Remote scope

                <select
                  name="remote-scope"
                  value={
                    jobForm.remote_scope
                  }
                  onChange={event =>
                    setJobForm(
                      current => ({
                        ...current,
                        remote_scope:
                          event.target.value
                      })
                    )
                  }
                >
                  <option value="country">
                    Remote within this country
                  </option>
                  <option value="region">
                    Remote within region / continent
                  </option>
                  <option value="worldwide">
                    Remote worldwide
                  </option>
                </select>
              </label>

            )}


            <textarea
              name="job-description"
              placeholder="Role description, requirements and what the student will work on."
              value={
                jobForm.description
              }
              onChange={event =>
                setJobForm(
                  current => ({
                    ...current,
                    description:
                      event.target.value
                  })
                )
              }
              style={{
                minHeight: 140
              }}
              required
            />


            <div className="grid2">

              <input
                name="application-url"
                type="url"
                placeholder="External application URL · optional"
                value={
                  jobForm.application_url
                }
                onChange={event =>
                  setJobForm(
                    current => ({
                      ...current,
                      application_url:
                        event.target.value
                    })
                  )
                }
              />


              <input
                name="job-expiry"
                type="datetime-local"
                value={
                  jobForm.expires_at
                }
                onChange={event =>
                  setJobForm(
                    current => ({
                      ...current,
                      expires_at:
                        event.target.value
                    })
                  )
                }
              />

            </div>


            <button
              className="btn primary"
              disabled={
                publishing
              }
            >
              {
                publishing
                  ? 'Publishing…'
                  : 'Publish opportunity'
              }
            </button>

          </form>

        )}


        <div
          className="section-title"
          style={{
            marginTop: 26
          }}
        >
          <div>
            <span className="eyebrow dark">
              YOUR LISTINGS
            </span>
            <h2>
              Published opportunities
            </h2>
          </div>
        </div>


        {loading ? (

          <div className="empty">
            Loading employer workspace…
          </div>

        ) : filtered.length === 0 ? (

          <div className="empty card">
            <BriefcaseBusiness />
            <h3>
              No opportunities published yet.
            </h3>
            <p>
              Publish your first role to start recruiting through <OnstoodWordmark />.
            </p>
          </div>

        ) : (

          <div className="job-grid">

            {filtered.map(item => {

              const count =
                applicants.filter(app =>
                  app.opportunity_id ===
                    item.id
                ).length;

              return (
                <div
                  className="card job"
                  key={item.id}
                >
                  <span>
                    {
                      item.opportunity_type
                        .replace('_', ' ')
                        .toUpperCase()
                    }
                  </span>

                  <h3>
                    {item.title}
                  </h3>

                  <p>
                    {item.workplace}
                    {item.city
                      ? ` · ${item.city}`
                      : ''}
                    {item.country
                      ? ` · ${item.country}`
                      : ''}
                    {item.workplace === 'remote' &&
                      item.remote_scope
                      ? ` · ${item.remote_scope}`
                      : ''}
                  </p>

                  <div className="metric">
                    <span>Applicants</span>
                    <b>{count}</b>
                  </div>

                  <small className="muted">
                    {
                      item.status
                    }
                    {' · '}
                    {
                      fmtDate(
                        item.published_at
                      )
                    }
                  </small>
                </div>
              );
            })}

          </div>

        )}


        <div
          className="section-title"
          style={{
            marginTop: 28
          }}
        >
          <div>
            <span className="eyebrow dark">
              PIPELINE
            </span>
            <h2>
              Applicants
            </h2>
          </div>
        </div>


        {applicants.length === 0 ? (

          <div className="empty card">
            <Users />
            <h3>
              No applications yet.
            </h3>
            <p>
              Student applications will appear here automatically.
            </p>
          </div>

        ) : (

          <div
            style={{
              display: 'grid',
              gap: 12
            }}
          >

            {applicants.map(item => (

              <div
                className="card"
                key={item.id}
              >

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 16,
                    flexWrap: 'wrap'
                  }}
                >

                  <div>
                    <b>
                      {
                        item.applicant
                          ? `${item.applicant.name || ''} ${item.applicant.surname || ''}`.trim()
                          : 'Applicant'
                      }
                    </b>

                    <small
                      className="muted"
                      style={{
                        display: 'block',
                        marginTop: 4
                      }}
                    >
                      {
                        item.applicant?.degree ||
                        'Student'
                      }
                      {item.applicant?.university
                        ? ` · ${item.applicant.university}`
                        : ''}
                    </small>

                    <p>
                      Applied for{' '}
                      <b>
                        {
                          item.opportunity?.title ||
                          'opportunity'
                        }
                      </b>
                    </p>

                    {item.cover_note && (
                      <p className="muted">
                        {item.cover_note}
                      </p>
                    )}
                  </div>


                  <div
                    style={{
                      minWidth: 190
                    }}
                  >
                    <small className="muted">
                      Application status
                    </small>

                    <select
                      value={item.status}
                      onChange={event =>
                        updateApplicationStatus(
                          item,
                          event.target.value
                        )
                      }
                      style={{
                        marginTop: 6
                      }}
                    >
                      <option value="applied">
                        Applied
                      </option>
                      <option value="reviewed">
                        Reviewed
                      </option>
                      <option value="interview">
                        Interview
                      </option>
                      <option value="accepted">
                        Accepted
                      </option>
                      <option value="rejected">
                        Rejected
                      </option>
                    </select>
                  </div>

                </div>

              </div>

            ))}

          </div>

        )}

      </Page>
    );

  }


  return (
    <Page
      eyebrow="FUTURE"
      title="Career & opportunities"
      action={
        <div className="search-box">
          <Search size={16} />
          <input
            name="career-search"
            placeholder="Search opportunities…"
            value={q}
            onChange={event =>
              setQ(
                event.target.value
              )
            }
          />
        </div>
      }
    >

      <div className="card career-hero">

        <div>
          <span className="eyebrow">
            <OnstoodWordmark /> CAREER
          </span>

          <h2>
            From university to opportunity.
          </h2>

          <p>
            Discover internships, graduate roles, projects, scholarships and student-friendly work from employers recruiting through <OnstoodWordmark />.
          </p>
        </div>

        <BriefcaseBusiness
          size={48}
        />

      </div>


      <div
        style={{
          display: 'flex',
          gap: 8,
          flexWrap: 'wrap',
          margin: '18px 0'
        }}
      >
        {[
          ['all', 'All'],
          ['internship', 'Internships'],
          ['part_time', 'Part-time'],
          ['graduate', 'Graduate'],
          ['project', 'Projects'],
          ['scholarship', 'Scholarships']
        ].map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={
              type === id
                ? 'btn primary'
                : 'btn subtle'
            }
            onClick={() =>
              setType(id)
            }
          >
            {label}
          </button>
        ))}
      </div>


      <div
        className="card"
        style={{
          padding: 14,
          marginBottom: 18
        }}
      >
        <div className="grid2">

          <label>
            Country

            <select
              name="career-country"
              value={countryFilter}
              onChange={event => {
                setCountryFilter(
                  event.target.value
                );
                setCityFilter('all');
              }}
            >
              <option value="all">
                All countries
              </option>

              {countries.map(country => (
                <option
                  key={country}
                  value={country}
                >
                  {country}
                </option>
              ))}
            </select>
          </label>


          <label>
            City

            <select
              name="career-city"
              value={cityFilter}
              onChange={event =>
                setCityFilter(
                  event.target.value
                )
              }
            >
              <option value="all">
                All cities
              </option>

              {cities.map(city => (
                <option
                  key={city}
                  value={city}
                >
                  {city}
                </option>
              ))}
            </select>
          </label>


          <label>
            Workplace

            <select
              name="career-workplace"
              value={workplaceFilter}
              onChange={event =>
                setWorkplaceFilter(
                  event.target.value
                )
              }
            >
              <option value="all">
                All workplace types
              </option>
              <option value="onsite">
                On-site
              </option>
              <option value="hybrid">
                Hybrid
              </option>
              <option value="remote">
                Remote
              </option>
            </select>
          </label>

        </div>
      </div>


      {loading ? (

        <div className="empty">
          Loading opportunities…
        </div>

      ) : filtered.length === 0 ? (

        <div className="empty card">
          <BriefcaseBusiness />
          <h3>
            No opportunities published yet.
          </h3>
          <p>
            Employer listings will appear here automatically.
          </p>
        </div>

      ) : (

        <div className="job-grid">

          {filtered.map(item => {

            const application =
              applicationByJob.get(
                item.id
              );

            return (
              <div
                className="card job"
                key={item.id}
              >

                <span>
                  {
                    item.opportunity_type
                      .replace('_', ' ')
                      .toUpperCase()
                  }
                </span>

                <h3>
                  {item.title}
                </h3>

                <p>
                  <b>
                    {item.organization}
                  </b>
                </p>

                <p>
                  {item.workplace}
                  {item.city
                    ? ` · ${item.city}`
                    : ''}
                  {item.country
                    ? ` · ${item.country}`
                    : ''}
                  {item.workplace === 'remote' &&
                    item.remote_scope
                    ? ` · ${item.remote_scope}`
                    : ''}
                </p>

                <p>
                  {
                    item.description ||
                    'Opportunity details'
                  }
                </p>

                <small className="muted">
                  Published{' '}
                  {
                    fmtDate(
                      item.published_at
                    )
                  }
                </small>


                {application ? (

                  <button
                    type="button"
                    className="btn subtle"
                    disabled
                  >
                    {
                      application.status
                        .replace('_', ' ')
                    }
                  </button>

                ) : (

                  <button
                    type="button"
                    className="btn primary"
                    onClick={() => {
                      setApplyTo(item);
                      setCoverNote('');
                    }}
                  >
                    Apply with <OnstoodWordmark />
                    <ChevronRight
                      size={15}
                    />
                  </button>

                )}

              </div>
            );

          })}

        </div>

      )}


      <div
        className="section-title"
        style={{
          marginTop: 28
        }}
      >
        <div>
          <span className="eyebrow dark">
            TRACKING
          </span>
          <h2>
            My Applications
          </h2>
        </div>
      </div>


      {applications.length === 0 ? (

        <div className="empty card">
          <FileText />
          <h3>
            No applications yet.
          </h3>
          <p>
            Your applications and their status will appear here.
          </p>
        </div>

      ) : (

        <div
          style={{
            display: 'grid',
            gap: 10
          }}
        >
          {applications.map(app => {

            const job =
              opportunities.find(item =>
                item.id ===
                app.opportunity_id
              );

            return (
              <div
                className="card"
                key={app.id}
              >
                <b>
                  {
                    job?.title ||
                    'Opportunity'
                  }
                </b>

                <small
                  className="muted"
                  style={{
                    display: 'block',
                    marginTop: 5
                  }}
                >
                  {
                    job?.organization ||
                    'Employer'
                  }
                  {' · '}
                  {
                    app.status
                      .replace('_', ' ')
                  }
                </small>
              </div>
            );
          })}
        </div>

      )}


      {applyTo && (

        <div
          role="dialog"
          aria-modal="true"
          onClick={() =>
            setApplyTo(null)
          }
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background:
              'rgba(15,23,42,0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20
          }}
        >
          <div
            className="card"
            onClick={event =>
              event.stopPropagation()
            }
            style={{
              width: 'min(560px, 94vw)'
            }}
          >
            <span className="eyebrow dark">
              APPLY
            </span>

            <h3>
              {applyTo.title}
            </h3>

            <p className="muted">
              {applyTo.organization}
            </p>

            <textarea
              name="cover-note"
              placeholder="Short note to the employer · optional"
              value={coverNote}
              onChange={event =>
                setCoverNote(
                  event.target.value
                )
              }
              style={{
                minHeight: 130
              }}
            />

            <div
              style={{
                display: 'flex',
                gap: 8,
                justifyContent: 'flex-end'
              }}
            >
              <button
                type="button"
                className="btn subtle"
                onClick={() =>
                  setApplyTo(null)
                }
              >
                Cancel
              </button>

              <button
                type="button"
                className="btn primary"
                onClick={() =>
                  apply(applyTo)
                }
              >
                Send application
              </button>
            </div>
          </div>
        </div>

      )}

    </Page>
  );
}

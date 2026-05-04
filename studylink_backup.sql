--
-- PostgreSQL database dump
--

\restrict gYnVADYHAmrvXSFafkpSCt1g0GPAWQctSB8w99Qv7jUH3pl4LulgG0DiF8DVuii

-- Dumped from database version 16.13
-- Dumped by pg_dump version 16.13

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: achievements; Type: TABLE; Schema: public; Owner: studylink
--

CREATE TABLE public.achievements (
    id integer NOT NULL,
    code character varying(50) NOT NULL,
    name character varying(120) NOT NULL,
    description text,
    points_required integer NOT NULL,
    icon_url text
);


ALTER TABLE public.achievements OWNER TO studylink;

--
-- Name: achievements_id_seq; Type: SEQUENCE; Schema: public; Owner: studylink
--

CREATE SEQUENCE public.achievements_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.achievements_id_seq OWNER TO studylink;

--
-- Name: achievements_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: studylink
--

ALTER SEQUENCE public.achievements_id_seq OWNED BY public.achievements.id;


--
-- Name: admin_activity_logs; Type: TABLE; Schema: public; Owner: studylink
--

CREATE TABLE public.admin_activity_logs (
    id integer NOT NULL,
    admin_id integer NOT NULL,
    action character varying(80) NOT NULL,
    target_type character varying(80) NOT NULL,
    target_id integer,
    details jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.admin_activity_logs OWNER TO studylink;

--
-- Name: admin_activity_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: studylink
--

CREATE SEQUENCE public.admin_activity_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.admin_activity_logs_id_seq OWNER TO studylink;

--
-- Name: admin_activity_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: studylink
--

ALTER SEQUENCE public.admin_activity_logs_id_seq OWNED BY public.admin_activity_logs.id;


--
-- Name: booking_reviews; Type: TABLE; Schema: public; Owner: studylink
--

CREATE TABLE public.booking_reviews (
    id integer NOT NULL,
    booking_id integer NOT NULL,
    reviewer_id integer NOT NULL,
    rating integer NOT NULL,
    comment text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT booking_reviews_rating_check CHECK (((rating >= 1) AND (rating <= 5)))
);


ALTER TABLE public.booking_reviews OWNER TO studylink;

--
-- Name: booking_reviews_id_seq; Type: SEQUENCE; Schema: public; Owner: studylink
--

CREATE SEQUENCE public.booking_reviews_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.booking_reviews_id_seq OWNER TO studylink;

--
-- Name: booking_reviews_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: studylink
--

ALTER SEQUENCE public.booking_reviews_id_seq OWNED BY public.booking_reviews.id;


--
-- Name: bookings; Type: TABLE; Schema: public; Owner: studylink
--

CREATE TABLE public.bookings (
    id integer NOT NULL,
    tutor_id integer NOT NULL,
    tutee_id integer NOT NULL,
    course_code character varying(30),
    session_time timestamp without time zone NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    notes text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT bookings_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'accepted'::character varying, 'rejected'::character varying, 'completed'::character varying, 'cancelled'::character varying])::text[])))
);


ALTER TABLE public.bookings OWNER TO studylink;

--
-- Name: bookings_id_seq; Type: SEQUENCE; Schema: public; Owner: studylink
--

CREATE SEQUENCE public.bookings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.bookings_id_seq OWNER TO studylink;

--
-- Name: bookings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: studylink
--

ALTER SEQUENCE public.bookings_id_seq OWNED BY public.bookings.id;


--
-- Name: courses; Type: TABLE; Schema: public; Owner: studylink
--

CREATE TABLE public.courses (
    code character varying(30) NOT NULL,
    name character varying(200) NOT NULL,
    faculty character varying(120),
    semester character varying(30)
);


ALTER TABLE public.courses OWNER TO studylink;

--
-- Name: notifications; Type: TABLE; Schema: public; Owner: studylink
--

CREATE TABLE public.notifications (
    id integer NOT NULL,
    recipient_id integer NOT NULL,
    message text NOT NULL,
    is_read boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.notifications OWNER TO studylink;

--
-- Name: notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: studylink
--

CREATE SEQUENCE public.notifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.notifications_id_seq OWNER TO studylink;

--
-- Name: notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: studylink
--

ALTER SEQUENCE public.notifications_id_seq OWNED BY public.notifications.id;


--
-- Name: resource_reviews; Type: TABLE; Schema: public; Owner: studylink
--

CREATE TABLE public.resource_reviews (
    id integer NOT NULL,
    resource_id integer NOT NULL,
    reviewer_id integer NOT NULL,
    rating integer NOT NULL,
    comment text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT resource_reviews_rating_check CHECK (((rating >= 1) AND (rating <= 5)))
);


ALTER TABLE public.resource_reviews OWNER TO studylink;

--
-- Name: resource_reviews_id_seq; Type: SEQUENCE; Schema: public; Owner: studylink
--

CREATE SEQUENCE public.resource_reviews_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.resource_reviews_id_seq OWNER TO studylink;

--
-- Name: resource_reviews_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: studylink
--

ALTER SEQUENCE public.resource_reviews_id_seq OWNED BY public.resource_reviews.id;


--
-- Name: resources; Type: TABLE; Schema: public; Owner: studylink
--

CREATE TABLE public.resources (
    id integer NOT NULL,
    course_code character varying(30),
    contributor_id integer NOT NULL,
    title character varying(250) NOT NULL,
    resource_type character varying(80) NOT NULL,
    file_url text NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    avg_rating numeric(4,2) DEFAULT 0 NOT NULL,
    rating_count integer DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.resources OWNER TO studylink;

--
-- Name: resources_id_seq; Type: SEQUENCE; Schema: public; Owner: studylink
--

CREATE SEQUENCE public.resources_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.resources_id_seq OWNER TO studylink;

--
-- Name: resources_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: studylink
--

ALTER SEQUENCE public.resources_id_seq OWNED BY public.resources.id;


--
-- Name: server_error_logs; Type: TABLE; Schema: public; Owner: studylink
--

CREATE TABLE public.server_error_logs (
    id bigint NOT NULL,
    path text NOT NULL,
    method character varying(12) NOT NULL,
    status_code integer NOT NULL,
    user_id integer,
    message text NOT NULL,
    stack text,
    request_body jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.server_error_logs OWNER TO studylink;

--
-- Name: server_error_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: studylink
--

CREATE SEQUENCE public.server_error_logs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.server_error_logs_id_seq OWNER TO studylink;

--
-- Name: server_error_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: studylink
--

ALTER SEQUENCE public.server_error_logs_id_seq OWNED BY public.server_error_logs.id;


--
-- Name: sessions; Type: TABLE; Schema: public; Owner: studylink
--

CREATE TABLE public.sessions (
    token text NOT NULL,
    user_id integer NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.sessions OWNER TO studylink;

--
-- Name: tutor_availability; Type: TABLE; Schema: public; Owner: studylink
--

CREATE TABLE public.tutor_availability (
    id integer NOT NULL,
    tutor_id integer NOT NULL,
    course_code character varying(30),
    day_of_week character varying(20) NOT NULL,
    start_time time without time zone NOT NULL,
    end_time time without time zone NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.tutor_availability OWNER TO studylink;

--
-- Name: tutor_availability_id_seq; Type: SEQUENCE; Schema: public; Owner: studylink
--

CREATE SEQUENCE public.tutor_availability_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.tutor_availability_id_seq OWNER TO studylink;

--
-- Name: tutor_availability_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: studylink
--

ALTER SEQUENCE public.tutor_availability_id_seq OWNED BY public.tutor_availability.id;


--
-- Name: tutor_verifications; Type: TABLE; Schema: public; Owner: studylink
--

CREATE TABLE public.tutor_verifications (
    id integer NOT NULL,
    tutor_id integer NOT NULL,
    course_code character varying(30),
    proof_url text NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    reviewed_by integer,
    review_notes text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    reviewed_at timestamp without time zone,
    CONSTRAINT tutor_verifications_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'approved'::character varying, 'rejected'::character varying])::text[])))
);


ALTER TABLE public.tutor_verifications OWNER TO studylink;

--
-- Name: tutor_verifications_id_seq; Type: SEQUENCE; Schema: public; Owner: studylink
--

CREATE SEQUENCE public.tutor_verifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.tutor_verifications_id_seq OWNER TO studylink;

--
-- Name: tutor_verifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: studylink
--

ALTER SEQUENCE public.tutor_verifications_id_seq OWNED BY public.tutor_verifications.id;


--
-- Name: user_achievements; Type: TABLE; Schema: public; Owner: studylink
--

CREATE TABLE public.user_achievements (
    user_id integer NOT NULL,
    achievement_id integer NOT NULL,
    earned_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.user_achievements OWNER TO studylink;

--
-- Name: user_login_history; Type: TABLE; Schema: public; Owner: studylink
--

CREATE TABLE public.user_login_history (
    id integer NOT NULL,
    user_id integer NOT NULL,
    login_date date NOT NULL,
    login_at timestamp without time zone DEFAULT now() NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.user_login_history OWNER TO studylink;

--
-- Name: user_login_history_id_seq; Type: SEQUENCE; Schema: public; Owner: studylink
--

CREATE SEQUENCE public.user_login_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_login_history_id_seq OWNER TO studylink;

--
-- Name: user_login_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: studylink
--

ALTER SEQUENCE public.user_login_history_id_seq OWNED BY public.user_login_history.id;


--
-- Name: user_points_log; Type: TABLE; Schema: public; Owner: studylink
--

CREATE TABLE public.user_points_log (
    id integer NOT NULL,
    user_id integer NOT NULL,
    points integer NOT NULL,
    reason text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.user_points_log OWNER TO studylink;

--
-- Name: user_points_log_id_seq; Type: SEQUENCE; Schema: public; Owner: studylink
--

CREATE SEQUENCE public.user_points_log_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_points_log_id_seq OWNER TO studylink;

--
-- Name: user_points_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: studylink
--

ALTER SEQUENCE public.user_points_log_id_seq OWNED BY public.user_points_log.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: studylink
--

CREATE TABLE public.users (
    id integer NOT NULL,
    student_id character varying(50),
    full_name character varying(200) NOT NULL,
    email character varying(200) NOT NULL,
    phone_number character varying(30),
    password_hash text NOT NULL,
    role character varying(20) NOT NULL,
    major character varying(120),
    year_of_study integer,
    bio text,
    is_verified boolean DEFAULT false NOT NULL,
    rating numeric(4,2) DEFAULT 0 NOT NULL,
    total_points integer DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    target_subjects text,
    expertise text[] DEFAULT ARRAY[]::text[] NOT NULL,
    profile_picture_url text,
    login_streak integer DEFAULT 0 NOT NULL,
    last_login_at timestamp without time zone,
    CONSTRAINT users_role_check CHECK (((role)::text = ANY ((ARRAY['tutee'::character varying, 'tutor'::character varying, 'admin'::character varying])::text[])))
);


ALTER TABLE public.users OWNER TO studylink;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: studylink
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO studylink;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: studylink
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: achievements id; Type: DEFAULT; Schema: public; Owner: studylink
--

ALTER TABLE ONLY public.achievements ALTER COLUMN id SET DEFAULT nextval('public.achievements_id_seq'::regclass);


--
-- Name: admin_activity_logs id; Type: DEFAULT; Schema: public; Owner: studylink
--

ALTER TABLE ONLY public.admin_activity_logs ALTER COLUMN id SET DEFAULT nextval('public.admin_activity_logs_id_seq'::regclass);


--
-- Name: booking_reviews id; Type: DEFAULT; Schema: public; Owner: studylink
--

ALTER TABLE ONLY public.booking_reviews ALTER COLUMN id SET DEFAULT nextval('public.booking_reviews_id_seq'::regclass);


--
-- Name: bookings id; Type: DEFAULT; Schema: public; Owner: studylink
--

ALTER TABLE ONLY public.bookings ALTER COLUMN id SET DEFAULT nextval('public.bookings_id_seq'::regclass);


--
-- Name: notifications id; Type: DEFAULT; Schema: public; Owner: studylink
--

ALTER TABLE ONLY public.notifications ALTER COLUMN id SET DEFAULT nextval('public.notifications_id_seq'::regclass);


--
-- Name: resource_reviews id; Type: DEFAULT; Schema: public; Owner: studylink
--

ALTER TABLE ONLY public.resource_reviews ALTER COLUMN id SET DEFAULT nextval('public.resource_reviews_id_seq'::regclass);


--
-- Name: resources id; Type: DEFAULT; Schema: public; Owner: studylink
--

ALTER TABLE ONLY public.resources ALTER COLUMN id SET DEFAULT nextval('public.resources_id_seq'::regclass);


--
-- Name: server_error_logs id; Type: DEFAULT; Schema: public; Owner: studylink
--

ALTER TABLE ONLY public.server_error_logs ALTER COLUMN id SET DEFAULT nextval('public.server_error_logs_id_seq'::regclass);


--
-- Name: tutor_availability id; Type: DEFAULT; Schema: public; Owner: studylink
--

ALTER TABLE ONLY public.tutor_availability ALTER COLUMN id SET DEFAULT nextval('public.tutor_availability_id_seq'::regclass);


--
-- Name: tutor_verifications id; Type: DEFAULT; Schema: public; Owner: studylink
--

ALTER TABLE ONLY public.tutor_verifications ALTER COLUMN id SET DEFAULT nextval('public.tutor_verifications_id_seq'::regclass);


--
-- Name: user_login_history id; Type: DEFAULT; Schema: public; Owner: studylink
--

ALTER TABLE ONLY public.user_login_history ALTER COLUMN id SET DEFAULT nextval('public.user_login_history_id_seq'::regclass);


--
-- Name: user_points_log id; Type: DEFAULT; Schema: public; Owner: studylink
--

ALTER TABLE ONLY public.user_points_log ALTER COLUMN id SET DEFAULT nextval('public.user_points_log_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: studylink
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: achievements; Type: TABLE DATA; Schema: public; Owner: studylink
--

COPY public.achievements (id, code, name, description, points_required, icon_url) FROM stdin;
423	POINTS_15	First Steps	Reached 15 points by getting active on StudyLink.	15	/ui/assets/badges/first-steps.svg
1	POINTS_50	Helping Hand	Reached 50 points by consistently helping classmates.	50	/ui/assets/badges/helping-hand.svg
2	POINTS_100	Campus Mentor	Reached 100 points through tutoring, reviews, and resource sharing.	100	/ui/assets/badges/campus-mentor.svg
426	POINTS_175	Community Builder	Reached 175 points by staying active across StudyLink.	175	/ui/assets/badges/community-builder.svg
3	POINTS_250	StudyLink Champion	Reached 250 points as one of the most active members.	250	/ui/assets/badges/studylink-champion.svg
\.


--
-- Data for Name: admin_activity_logs; Type: TABLE DATA; Schema: public; Owner: studylink
--

COPY public.admin_activity_logs (id, admin_id, action, target_type, target_id, details, created_at) FROM stdin;
\.


--
-- Data for Name: booking_reviews; Type: TABLE DATA; Schema: public; Owner: studylink
--

COPY public.booking_reviews (id, booking_id, reviewer_id, rating, comment, created_at) FROM stdin;
1	1	9	5	good	2026-04-04 04:55:53.015243
5	1	2	5	gg	2026-04-04 05:13:24.216424
6	4	9	4	good	2026-04-20 05:59:31.413579
\.


--
-- Data for Name: bookings; Type: TABLE DATA; Schema: public; Owner: studylink
--

COPY public.bookings (id, tutor_id, tutee_id, course_code, session_time, status, notes, created_at) FROM stdin;
1	9	2	\N	2026-04-05 13:51:00	completed	\N	2026-04-04 04:50:57.101367
4	9	2	TMF3963	2026-04-22 17:00:00	completed	\N	2026-04-20 05:56:40.019975
\.


--
-- Data for Name: courses; Type: TABLE DATA; Schema: public; Owner: studylink
--

COPY public.courses (code, name, faculty, semester) FROM stdin;
TMF3953	Distributed Systems	Computer Science and IT	Semester 2
TMF3963	Computer Graphics	Computer Science and IT	Semester 2
TMF3973	Database Systems	Computer Science and IT	Semester 1
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: studylink
--

COPY public.notifications (id, recipient_id, message, is_read, created_at) FROM stdin;
18	1	You earned 15 Learning Points: Uploaded resource	t	2026-04-04 05:41:52.036696
30	1	You earned 5 Learning Points: Profile updated	t	2026-04-13 04:23:24.597924
29	1	You earned 5 Learning Points: Profile updated	t	2026-04-13 04:23:23.49604
31	1	You earned 5 Learning Points: Profile updated	t	2026-04-13 04:23:33.829548
32	1	You earned 5 Learning Points: Profile updated	t	2026-04-13 05:51:01.731554
9	2	Tutoring session #1 is marked complete. Please leave a review.	t	2026-04-04 04:51:45.120599
6	2	Your booking #1 was accepted.	t	2026-04-04 04:51:13.737105
37	1	You earned 5 Learning Points: Profile updated	t	2026-04-13 06:24:53.74096
36	1	You earned 5 Learning Points: Profile updated	t	2026-04-13 06:24:39.127464
35	1	You earned 5 Learning Points: Profile updated	t	2026-04-13 06:19:53.032939
34	1	You earned 5 Learning Points: Profile updated	t	2026-04-13 06:19:48.84359
33	1	You earned 5 Learning Points: Profile updated	t	2026-04-13 06:13:50.363708
38	1	You earned 5 Learning Points: Profile updated	t	2026-04-13 06:35:03.165188
39	1	You earned 5 Learning Points: Profile updated	t	2026-04-13 07:05:28.636132
40	1	You earned 5 Learning Points: Profile updated	f	2026-04-13 07:11:53.711818
41	1	You earned 5 Learning Points: Profile updated	f	2026-04-13 07:12:01.684567
42	1	You earned 5 Learning Points: Profile updated	f	2026-04-13 07:14:06.114085
43	1	You earned 5 Learning Points: Profile updated	f	2026-04-13 07:14:14.098485
28	2	You earned 6 Learning Points: Rated a resource	t	2026-04-04 05:56:03.504007
27	2	You earned 6 Learning Points: Rated a resource	t	2026-04-04 05:56:01.110135
26	2	You earned 6 Learning Points: Rated a resource	t	2026-04-04 05:54:52.74636
25	2	You earned 6 Learning Points: Rated a resource	t	2026-04-04 05:54:50.137071
24	2	You earned 6 Learning Points: Rated a resource	t	2026-04-04 05:50:38.819217
23	2	You earned 6 Learning Points: Rated a resource	t	2026-04-04 05:50:37.639197
22	2	You earned 6 Learning Points: Rated a resource	t	2026-04-04 05:50:34.809557
21	2	You earned 6 Learning Points: Rated a resource	t	2026-04-04 05:49:18.069972
20	2	You earned 6 Learning Points: Rated a resource	t	2026-04-04 05:49:17.366001
19	2	You earned 6 Learning Points: Rated a resource	t	2026-04-04 05:49:15.751366
17	2	You earned 6 Learning Points: Rated a resource	t	2026-04-04 05:41:48.901991
16	2	You earned 6 Learning Points: Rated a resource	t	2026-04-04 05:41:47.186177
15	2	You earned 15 Learning Points: Uploaded resource	t	2026-04-04 05:41:20.819953
14	2	You earned 8 Learning Points: Submitted tutoring session review	t	2026-04-04 05:13:24.216424
11	2	You earned 8 Learning Points: Submitted tutoring session review	t	2026-04-04 04:56:04.926347
10	2	You earned 8 Learning Points: Submitted tutoring session review	t	2026-04-04 04:55:53.015243
62	9	You earned 6 Learning Points: Rated a resource	t	2026-04-18 00:57:12.740562
61	9	You earned 6 Learning Points: Rated a resource	t	2026-04-18 00:56:24.266811
60	9	You earned 6 Learning Points: Rated a resource	t	2026-04-18 00:56:08.759355
59	9	You earned 6 Learning Points: Rated a resource	t	2026-04-18 00:54:08.037324
58	9	You earned 6 Learning Points: Rated a resource	t	2026-04-18 00:54:07.324528
57	9	You earned 6 Learning Points: Rated a resource	t	2026-04-18 00:54:06.72522
56	9	You earned 6 Learning Points: Rated a resource	t	2026-04-18 00:54:06.230114
55	9	You earned 6 Learning Points: Rated a resource	t	2026-04-18 00:54:05.431486
54	9	You earned 6 Learning Points: Rated a resource	t	2026-04-18 00:52:42.023385
53	9	You earned 6 Learning Points: Rated a resource	t	2026-04-18 00:52:41.02528
52	9	You earned 6 Learning Points: Rated a resource	t	2026-04-18 00:52:40.539937
51	9	You earned 6 Learning Points: Rated a resource	t	2026-04-18 00:52:40.089419
50	9	You earned 6 Learning Points: Rated a resource	t	2026-04-18 00:52:39.111121
49	9	You earned 6 Learning Points: Rated a resource	t	2026-04-18 00:52:38.344229
48	9	You earned 6 Learning Points: Rated a resource	t	2026-04-18 00:52:37.778967
47	9	You earned 6 Learning Points: Rated a resource	t	2026-04-18 00:52:36.982176
46	9	You earned 6 Learning Points: Rated a resource	t	2026-04-18 00:52:36.024779
45	9	You earned 6 Learning Points: Rated a resource	t	2026-04-18 00:52:34.060239
44	9	You earned 6 Learning Points: Rated a resource	t	2026-04-18 00:52:31.540954
13	9	You earned 8 Learning Points: Submitted tutoring session review	t	2026-04-04 05:10:02.270118
12	9	You earned 8 Learning Points: Submitted tutoring session review	t	2026-04-04 05:00:35.159475
8	9	You earned 20 Learning Points: Completed tutoring session	t	2026-04-04 04:51:45.120599
7	9	You earned 10 Learning Points: Accepted tutoring booking	t	2026-04-04 04:51:13.737105
5	9	New tutoring booking request from Test Tutee.	t	2026-04-04 04:50:57.101367
4	9	Your tutor verification application was approved.	t	2026-04-04 04:41:30.161687
3	9	You earned 20 Learning Points: Tutor verification approved	t	2026-04-04 04:41:30.161687
2	9	Your tutor verification application was rejected.	t	2026-04-04 04:41:26.234122
1	9	Your tutor verification application was rejected.	t	2026-04-04 04:41:24.646802
63	1	You earned 5 Learning Points: Profile updated	f	2026-04-18 01:15:41.523844
64	9	New tutoring booking request from Test Tutee.	f	2026-04-20 05:56:40.019975
65	2	Your booking #4 was accepted.	f	2026-04-20 05:59:12.38922
66	9	You earned 10 Learning Points: Accepted tutoring booking	f	2026-04-20 05:59:12.38922
67	9	You earned 20 Learning Points: Completed tutoring session	f	2026-04-20 05:59:13.813702
68	2	Tutoring session #4 is marked complete. Please leave a review.	f	2026-04-20 05:59:13.813702
69	9	You earned 8 Learning Points: Submitted tutoring session review	f	2026-04-20 05:59:31.413579
\.


--
-- Data for Name: resource_reviews; Type: TABLE DATA; Schema: public; Owner: studylink
--

COPY public.resource_reviews (id, resource_id, reviewer_id, rating, comment, created_at) FROM stdin;
3	2	2	4	Rated 4 stars	2026-04-04 05:56:01.110135
1	1	2	5	Rated 5 stars	2026-04-04 05:56:03.504007
13	1	9	2	just try	2026-04-18 00:57:12.740562
\.


--
-- Data for Name: resources; Type: TABLE DATA; Schema: public; Owner: studylink
--

COPY public.resources (id, course_code, contributor_id, title, resource_type, file_url, metadata, avg_rating, rating_count, created_at) FROM stdin;
1	TMF3963	2	Song	Youtube Link	https://music.youtube.com/watch?v=im9c7JrsTQY&list=RDAMVMhtcymo9myc0	{"fileName": null, "uploadKind": "link", "externalLink": "https://music.youtube.com/watch?v=im9c7JrsTQY&list=RDAMVMhtcymo9myc0", "originalName": null}	3.50	2	2026-04-04 05:41:20.819953
2	TMF3953	1	Test Upload	notes	/uploads/resources/resource-1-1775281312034-688c000c.txt	{"fileName": "resource-1-1775281312034-688c000c.txt", "uploadKind": "file", "externalLink": null, "originalName": "studylink-upload-test.txt"}	4.00	1	2026-04-04 05:41:52.036696
\.


--
-- Data for Name: server_error_logs; Type: TABLE DATA; Schema: public; Owner: studylink
--

COPY public.server_error_logs (id, path, method, status_code, user_id, message, stack, request_body, created_at) FROM stdin;
\.


--
-- Data for Name: sessions; Type: TABLE DATA; Schema: public; Owner: studylink
--

COPY public.sessions (token, user_id, expires_at, created_at) FROM stdin;
69d70ad0-141f-4d20-a976-6abdbfc61f54	1	2026-04-05 04:12:46.02	2026-04-04 04:12:46.02172
08acbb1b-e922-46da-8273-aeb17a389431	1	2026-04-05 04:21:21.394	2026-04-04 04:21:21.395731
409fb0bb-16e5-4728-83db-550d3b29ec68	9	2026-04-05 04:31:35.335	2026-04-04 04:31:35.336097
4972c5fb-ac4e-487d-9286-c80d93d3e377	1	2026-04-05 04:36:06.841	2026-04-04 04:36:06.842363
2cb92e6b-201e-47a7-bda2-813c069ac453	9	2026-04-05 04:38:54.507	2026-04-04 04:38:54.508435
d840e961-ea88-41f8-873e-00ddd5324151	1	2026-04-05 04:41:13.17	2026-04-04 04:41:13.171593
cdc4d3ac-a24a-496a-be28-e1eb42b56869	9	2026-04-05 04:41:39.739	2026-04-04 04:41:39.740283
3dc2b875-bccd-4757-827f-957398fa865b	1	2026-04-05 04:48:42.033	2026-04-04 04:48:42.034372
f1a6c1d2-f267-4583-b8ad-7f98e024245f	9	2026-04-05 04:51:06.933	2026-04-04 04:51:06.933536
36d797a6-d7ef-4a68-a71f-85e9fb7e5265	9	2026-04-05 04:51:40.319	2026-04-04 04:51:40.319627
4234dde1-c59f-4da1-b553-49e0bfa515bf	1	2026-04-05 04:58:01.013	2026-04-04 04:58:01.014126
646516c1-3547-429a-9901-344035651d6f	9	2026-04-05 04:59:08.279	2026-04-04 04:59:08.280348
f123b36e-f9dd-445d-ab16-c3129c3c9c22	1	2026-04-05 05:09:36.924	2026-04-04 05:09:36.925315
14a1cd42-168d-4923-bb4b-1d9eb11801a6	1	2026-04-05 05:12:30.623	2026-04-04 05:12:30.624296
094d9bce-6a22-4978-a5c9-b4a8b3cb77f4	1	2026-04-05 05:13:39.184	2026-04-04 05:13:39.185323
4b4fa985-9efc-46c1-ae8a-ba105b891db2	1	2026-04-05 05:22:07.667	2026-04-04 05:22:07.668209
79ad0477-c003-4eae-a277-37c4b19f174d	1	2026-04-05 05:23:23.713	2026-04-04 05:23:23.714085
d188ff9d-f216-4b34-beb8-820c112d1532	1	2026-04-05 05:28:17.009	2026-04-04 05:28:17.010583
2e7df540-d244-4c57-8c54-a5690a789454	1	2026-04-05 05:29:12.087	2026-04-04 05:29:12.088838
97b32e59-903d-4344-867c-1da7a148de23	1	2026-04-05 05:35:01.45	2026-04-04 05:35:01.451538
03d8e3dc-9078-44f5-bd57-31298abc4927	1	2026-04-05 05:40:42.218	2026-04-04 05:40:42.219572
8d101521-426b-4550-9ea7-118286a34f0d	1	2026-04-05 05:41:34.683	2026-04-04 05:41:34.683696
c107e0c6-6286-4717-bd7f-0e1d26230e6e	1	2026-04-05 05:41:51.999	2026-04-04 05:41:52.000636
aa064ab3-8e00-4d2c-a1ee-d96cd792faa3	1	2026-04-05 05:41:55.978	2026-04-04 05:41:55.979323
97055e6d-08b8-498a-a5bd-8ca958f29b25	1	2026-04-05 05:47:49.898	2026-04-04 05:47:49.89869
b1ac6a76-bcea-484d-9e82-fede33d9e058	1	2026-04-05 05:54:40.061	2026-04-04 05:54:40.06262
51ed9458-8faa-4b72-853c-191882affdbc	1	2026-04-05 09:48:56.293	2026-04-04 09:48:56.29374
adc604a3-0c4e-4710-ad10-f37554ae231f	1	2026-04-05 09:49:59.707	2026-04-04 09:49:59.707627
6d92d586-0bcb-4d83-9549-dcea30530c56	1	2026-04-05 09:53:32.499	2026-04-04 09:53:32.500561
05141a89-b4e1-48ff-81c3-b3426e7beff8	1	2026-04-05 09:55:06.694	2026-04-04 09:55:06.695716
d3dcdf27-4f9a-4053-ad86-4f84769624bf	1	2026-04-14 07:28:35.288	2026-04-12 23:28:35.289954
31a4fe5b-d96f-46c3-bd86-0243e0abfa72	1	2026-04-14 07:31:36.564	2026-04-12 23:31:36.565677
4c949bfc-6a9a-425a-a9e2-09263f54dca8	1	2026-04-14 07:55:02.994	2026-04-12 23:55:02.995569
ea5922e0-b881-4c74-982e-82cb39594d7c	1	2026-04-14 08:16:15.712	2026-04-13 00:16:15.714271
c9f8b7ea-ccb2-4c57-b24b-592596824d3c	9	2026-04-14 08:31:39.261	2026-04-13 00:31:39.262396
c374c3d3-1a89-42b5-9f7e-959c1544ffcf	1	2026-04-14 09:57:21.276	2026-04-13 01:57:21.278006
f9688813-c851-4e54-b564-9bff8062be01	1	2026-04-14 10:31:09.569	2026-04-13 02:31:09.570627
8f72d766-e72b-4adb-a6bd-be06e965b262	1	2026-04-14 14:55:47.369	2026-04-13 06:55:47.372961
78b0caa0-7fc3-4b22-90c5-88ae4d7d279e	101	2026-04-14 06:56:51.317	2026-04-13 06:56:51.317899
24846959-bbc1-4d07-b14d-2f3b21ba5d48	1	2026-04-14 07:12:07.19	2026-04-13 07:12:07.191541
456db4b1-93d1-4a48-bb38-25403300a5f6	2	2026-04-18 18:41:04.243	2026-04-17 18:41:04.243881
3fde3b51-cc8e-4926-9ff2-ffdeef102c0e	2	2026-04-18 18:42:21.971	2026-04-17 18:42:21.972701
1026a8ca-af93-4ca3-ba2f-200dacb15556	2	2026-04-18 18:51:18.624	2026-04-17 18:51:18.624927
07dae6f5-7b59-4d85-93d3-d3035b57c6ed	9	2026-04-28 11:21:05.387	2026-04-27 03:21:05.263166
7ea75892-9545-4dd1-9a33-904366a727a7	9	2026-04-29 01:13:57.648	2026-04-27 17:13:57.497497
\.


--
-- Data for Name: tutor_availability; Type: TABLE DATA; Schema: public; Owner: studylink
--

COPY public.tutor_availability (id, tutor_id, course_code, day_of_week, start_time, end_time, created_at) FROM stdin;
2	9	TMF3963	Monday	12:30:00	12:45:00	2026-04-04 04:47:00.22631
\.


--
-- Data for Name: tutor_verifications; Type: TABLE DATA; Schema: public; Owner: studylink
--

COPY public.tutor_verifications (id, tutor_id, course_code, proof_url, status, reviewed_by, review_notes, created_at, reviewed_at) FROM stdin;
2	9	\N	/uploads/verifications/verification-9-1775277355315-d4328cb4.png	rejected	1	\N	2026-04-04 04:35:55.406087	2026-04-04 04:41:24.646802
1	9	\N	/uploads/verifications/verification-9-1775277351155-d2327b27.png	rejected	1	\N	2026-04-04 04:35:51.253423	2026-04-04 04:41:26.234122
5	9	TMF3973	/uploads/verifications/verification-9-1775277669752-84bd09cc.png	approved	1	\N	2026-04-04 04:41:09.840397	2026-04-04 04:41:30.161687
\.


--
-- Data for Name: user_achievements; Type: TABLE DATA; Schema: public; Owner: studylink
--

COPY public.user_achievements (user_id, achievement_id, earned_at) FROM stdin;
9	1	2026-04-04 04:51:45.120599
2	1	2026-04-04 05:41:48.901991
2	2	2026-04-04 05:56:01.110135
1	1	2026-04-13 06:19:53.034787
1	423	2026-04-17 18:50:52.750438
2	423	2026-04-17 18:50:52.750438
9	423	2026-04-17 18:50:52.750438
9	2	2026-04-18 00:52:38.344229
9	426	2026-04-18 00:57:12.740562
\.


--
-- Data for Name: user_login_history; Type: TABLE DATA; Schema: public; Owner: studylink
--

COPY public.user_login_history (id, user_id, login_date, login_at, created_at) FROM stdin;
1	9	2026-04-27	2026-04-27 11:21:05.315	2026-04-26 17:08:28.347878
10	9	2026-04-28	2026-04-28 01:13:57.563	2026-04-27 17:13:57.497497
\.


--
-- Data for Name: user_points_log; Type: TABLE DATA; Schema: public; Owner: studylink
--

COPY public.user_points_log (id, user_id, points, reason, created_at) FROM stdin;
1	1	5	profile_update	2026-04-13 06:19:48.840544
2	1	5	profile_update	2026-04-13 06:19:53.031116
3	1	5	profile_update	2026-04-13 06:24:39.124151
4	1	5	profile_update	2026-04-13 06:24:53.738668
5	1	5	profile_update	2026-04-13 06:35:03.162693
6	1	5	profile_update	2026-04-13 07:05:28.628797
7	1	5	profile_update	2026-04-13 07:11:53.7089
8	1	5	profile_update	2026-04-13 07:12:01.683295
9	1	5	profile_update	2026-04-13 07:14:06.111758
10	1	5	profile_update	2026-04-13 07:14:14.093992
11	9	6	resource_review	2026-04-18 00:52:31.540954
12	9	6	resource_review	2026-04-18 00:52:34.060239
13	9	6	resource_review	2026-04-18 00:52:36.024779
14	9	6	resource_review	2026-04-18 00:52:36.982176
15	9	6	resource_review	2026-04-18 00:52:37.778967
16	9	6	resource_review	2026-04-18 00:52:38.344229
17	9	6	resource_review	2026-04-18 00:52:39.111121
18	9	6	resource_review	2026-04-18 00:52:40.089419
19	9	6	resource_review	2026-04-18 00:52:40.539937
20	9	6	resource_review	2026-04-18 00:52:41.02528
21	9	6	resource_review	2026-04-18 00:52:42.023385
22	9	6	resource_review	2026-04-18 00:54:05.431486
23	9	6	resource_review	2026-04-18 00:54:06.230114
24	9	6	resource_review	2026-04-18 00:54:06.72522
25	9	6	resource_review	2026-04-18 00:54:07.324528
26	9	6	resource_review	2026-04-18 00:54:08.037324
27	9	6	resource_review	2026-04-18 00:56:08.759355
28	9	6	resource_review	2026-04-18 00:56:24.266811
29	9	6	resource_review	2026-04-18 00:57:12.740562
30	1	5	profile_update	2026-04-18 01:15:41.519536
31	9	10	booking_progress	2026-04-20 05:59:12.38922
32	9	20	booking_progress	2026-04-20 05:59:13.813702
33	9	8	booking_progress	2026-04-20 05:59:31.413579
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: studylink
--

COPY public.users (id, student_id, full_name, email, phone_number, password_hash, role, major, year_of_study, bio, is_verified, rating, total_points, created_at, target_subjects, expertise, profile_picture_url, login_streak, last_login_at) FROM stdin;
9	82766	Najmi Nasir	nnajmi302@gmail.com	013-906 4513	100000:234be6b80efccae9b9f1d2d388fe5140:c23fe48584535491fbed33ce16617b2c80d371cd8e0769cca2da57e86a485fa1b9258e1fc2369b5a9eaeae1729632333b4c72459df2e4f0f2fd95954e9f2343d	tutor	Multimedia Computing	4	\N	t	5.00	218	2026-04-04 04:31:25.486073	\N	{}	\N	2	2026-04-28 01:13:57.563
1	ADMIN-001	nanas	admin@studylink.local	0139064513	100000:bbe79f1c511b429d7dc036bf5fda3e55:c38708058fa4fafdc576786c5845231d910dc0a18be15829a2f8dd483b9db87f1e8233c0701382faaf2bab6f900cc765634c1fbe4cd89273a719c1b1d981e948	admin	Multimedia Computing	4	hii	t	0.00	95	2026-04-04 04:01:58.4448	\N	{}	/uploads/profile-pictures/profile-1-1776064454055-0d7c0b22.jpg	1	2026-04-20 13:58:18.01
2	TUTEE-1001	Test Tutee	tutee1@example.com	\N	100000:e61d8486051565e595a739559a333634:30276ff309282107ff33558b2ad84056f493de30db47c576bddef8720def6a26c2ca76ed33b4470b0c8318b4e93bfb0aef672b7c28f50ed1e6bfe97821489181	tutee	CS	2	\N	t	4.67	111	2026-04-04 04:02:12.413519	\N	{}	\N	1	2026-04-20 13:51:26.413
101	TMP-1776063411084	Tmp User	tmp1776063411084@test.local	\N	100000:bfa5adc90cacb584f059fbd25a2c4728:01402e9334b5cd04f9a9b64590ca1d90b6749abe51630de28f36f4d03955ced3d6fa21d040278d00d813664e121c556384685f56b1727b9ed7a443aeac75be9a	tutee	\N	\N	\N	t	0.00	0	2026-04-13 06:56:51.228607	\N	{}	\N	0	\N
\.


--
-- Name: achievements_id_seq; Type: SEQUENCE SET; Schema: public; Owner: studylink
--

SELECT pg_catalog.setval('public.achievements_id_seq', 710, true);


--
-- Name: admin_activity_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: studylink
--

SELECT pg_catalog.setval('public.admin_activity_logs_id_seq', 1, false);


--
-- Name: booking_reviews_id_seq; Type: SEQUENCE SET; Schema: public; Owner: studylink
--

SELECT pg_catalog.setval('public.booking_reviews_id_seq', 6, true);


--
-- Name: bookings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: studylink
--

SELECT pg_catalog.setval('public.bookings_id_seq', 4, true);


--
-- Name: notifications_id_seq; Type: SEQUENCE SET; Schema: public; Owner: studylink
--

SELECT pg_catalog.setval('public.notifications_id_seq', 69, true);


--
-- Name: resource_reviews_id_seq; Type: SEQUENCE SET; Schema: public; Owner: studylink
--

SELECT pg_catalog.setval('public.resource_reviews_id_seq', 31, true);


--
-- Name: resources_id_seq; Type: SEQUENCE SET; Schema: public; Owner: studylink
--

SELECT pg_catalog.setval('public.resources_id_seq', 2, true);


--
-- Name: server_error_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: studylink
--

SELECT pg_catalog.setval('public.server_error_logs_id_seq', 1, false);


--
-- Name: tutor_availability_id_seq; Type: SEQUENCE SET; Schema: public; Owner: studylink
--

SELECT pg_catalog.setval('public.tutor_availability_id_seq', 2, true);


--
-- Name: tutor_verifications_id_seq; Type: SEQUENCE SET; Schema: public; Owner: studylink
--

SELECT pg_catalog.setval('public.tutor_verifications_id_seq', 5, true);


--
-- Name: user_login_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: studylink
--

SELECT pg_catalog.setval('public.user_login_history_id_seq', 10, true);


--
-- Name: user_points_log_id_seq; Type: SEQUENCE SET; Schema: public; Owner: studylink
--

SELECT pg_catalog.setval('public.user_points_log_id_seq', 33, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: studylink
--

SELECT pg_catalog.setval('public.users_id_seq', 195, true);


--
-- Name: achievements achievements_code_key; Type: CONSTRAINT; Schema: public; Owner: studylink
--

ALTER TABLE ONLY public.achievements
    ADD CONSTRAINT achievements_code_key UNIQUE (code);


--
-- Name: achievements achievements_pkey; Type: CONSTRAINT; Schema: public; Owner: studylink
--

ALTER TABLE ONLY public.achievements
    ADD CONSTRAINT achievements_pkey PRIMARY KEY (id);


--
-- Name: admin_activity_logs admin_activity_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: studylink
--

ALTER TABLE ONLY public.admin_activity_logs
    ADD CONSTRAINT admin_activity_logs_pkey PRIMARY KEY (id);


--
-- Name: booking_reviews booking_reviews_booking_id_reviewer_id_key; Type: CONSTRAINT; Schema: public; Owner: studylink
--

ALTER TABLE ONLY public.booking_reviews
    ADD CONSTRAINT booking_reviews_booking_id_reviewer_id_key UNIQUE (booking_id, reviewer_id);


--
-- Name: booking_reviews booking_reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: studylink
--

ALTER TABLE ONLY public.booking_reviews
    ADD CONSTRAINT booking_reviews_pkey PRIMARY KEY (id);


--
-- Name: bookings bookings_pkey; Type: CONSTRAINT; Schema: public; Owner: studylink
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_pkey PRIMARY KEY (id);


--
-- Name: courses courses_pkey; Type: CONSTRAINT; Schema: public; Owner: studylink
--

ALTER TABLE ONLY public.courses
    ADD CONSTRAINT courses_pkey PRIMARY KEY (code);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: studylink
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: resource_reviews resource_reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: studylink
--

ALTER TABLE ONLY public.resource_reviews
    ADD CONSTRAINT resource_reviews_pkey PRIMARY KEY (id);


--
-- Name: resource_reviews resource_reviews_resource_id_reviewer_id_key; Type: CONSTRAINT; Schema: public; Owner: studylink
--

ALTER TABLE ONLY public.resource_reviews
    ADD CONSTRAINT resource_reviews_resource_id_reviewer_id_key UNIQUE (resource_id, reviewer_id);


--
-- Name: resources resources_pkey; Type: CONSTRAINT; Schema: public; Owner: studylink
--

ALTER TABLE ONLY public.resources
    ADD CONSTRAINT resources_pkey PRIMARY KEY (id);


--
-- Name: server_error_logs server_error_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: studylink
--

ALTER TABLE ONLY public.server_error_logs
    ADD CONSTRAINT server_error_logs_pkey PRIMARY KEY (id);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: studylink
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (token);


--
-- Name: tutor_availability tutor_availability_pkey; Type: CONSTRAINT; Schema: public; Owner: studylink
--

ALTER TABLE ONLY public.tutor_availability
    ADD CONSTRAINT tutor_availability_pkey PRIMARY KEY (id);


--
-- Name: tutor_verifications tutor_verifications_pkey; Type: CONSTRAINT; Schema: public; Owner: studylink
--

ALTER TABLE ONLY public.tutor_verifications
    ADD CONSTRAINT tutor_verifications_pkey PRIMARY KEY (id);


--
-- Name: user_achievements user_achievements_pkey; Type: CONSTRAINT; Schema: public; Owner: studylink
--

ALTER TABLE ONLY public.user_achievements
    ADD CONSTRAINT user_achievements_pkey PRIMARY KEY (user_id, achievement_id);


--
-- Name: user_login_history user_login_history_pkey; Type: CONSTRAINT; Schema: public; Owner: studylink
--

ALTER TABLE ONLY public.user_login_history
    ADD CONSTRAINT user_login_history_pkey PRIMARY KEY (id);


--
-- Name: user_login_history user_login_history_user_id_login_date_key; Type: CONSTRAINT; Schema: public; Owner: studylink
--

ALTER TABLE ONLY public.user_login_history
    ADD CONSTRAINT user_login_history_user_id_login_date_key UNIQUE (user_id, login_date);


--
-- Name: user_points_log user_points_log_pkey; Type: CONSTRAINT; Schema: public; Owner: studylink
--

ALTER TABLE ONLY public.user_points_log
    ADD CONSTRAINT user_points_log_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: studylink
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: studylink
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_student_id_key; Type: CONSTRAINT; Schema: public; Owner: studylink
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_student_id_key UNIQUE (student_id);


--
-- Name: admin_activity_logs admin_activity_logs_admin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: studylink
--

ALTER TABLE ONLY public.admin_activity_logs
    ADD CONSTRAINT admin_activity_logs_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: booking_reviews booking_reviews_booking_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: studylink
--

ALTER TABLE ONLY public.booking_reviews
    ADD CONSTRAINT booking_reviews_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE CASCADE;


--
-- Name: booking_reviews booking_reviews_reviewer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: studylink
--

ALTER TABLE ONLY public.booking_reviews
    ADD CONSTRAINT booking_reviews_reviewer_id_fkey FOREIGN KEY (reviewer_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: bookings bookings_course_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: studylink
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_course_code_fkey FOREIGN KEY (course_code) REFERENCES public.courses(code);


--
-- Name: bookings bookings_tutee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: studylink
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_tutee_id_fkey FOREIGN KEY (tutee_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: bookings bookings_tutor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: studylink
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_tutor_id_fkey FOREIGN KEY (tutor_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_recipient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: studylink
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_recipient_id_fkey FOREIGN KEY (recipient_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: resource_reviews resource_reviews_resource_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: studylink
--

ALTER TABLE ONLY public.resource_reviews
    ADD CONSTRAINT resource_reviews_resource_id_fkey FOREIGN KEY (resource_id) REFERENCES public.resources(id) ON DELETE CASCADE;


--
-- Name: resource_reviews resource_reviews_reviewer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: studylink
--

ALTER TABLE ONLY public.resource_reviews
    ADD CONSTRAINT resource_reviews_reviewer_id_fkey FOREIGN KEY (reviewer_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: resources resources_contributor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: studylink
--

ALTER TABLE ONLY public.resources
    ADD CONSTRAINT resources_contributor_id_fkey FOREIGN KEY (contributor_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: resources resources_course_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: studylink
--

ALTER TABLE ONLY public.resources
    ADD CONSTRAINT resources_course_code_fkey FOREIGN KEY (course_code) REFERENCES public.courses(code);


--
-- Name: server_error_logs server_error_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: studylink
--

ALTER TABLE ONLY public.server_error_logs
    ADD CONSTRAINT server_error_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: sessions sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: studylink
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: tutor_availability tutor_availability_course_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: studylink
--

ALTER TABLE ONLY public.tutor_availability
    ADD CONSTRAINT tutor_availability_course_code_fkey FOREIGN KEY (course_code) REFERENCES public.courses(code);


--
-- Name: tutor_availability tutor_availability_tutor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: studylink
--

ALTER TABLE ONLY public.tutor_availability
    ADD CONSTRAINT tutor_availability_tutor_id_fkey FOREIGN KEY (tutor_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: tutor_verifications tutor_verifications_course_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: studylink
--

ALTER TABLE ONLY public.tutor_verifications
    ADD CONSTRAINT tutor_verifications_course_code_fkey FOREIGN KEY (course_code) REFERENCES public.courses(code);


--
-- Name: tutor_verifications tutor_verifications_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: studylink
--

ALTER TABLE ONLY public.tutor_verifications
    ADD CONSTRAINT tutor_verifications_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.users(id);


--
-- Name: tutor_verifications tutor_verifications_tutor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: studylink
--

ALTER TABLE ONLY public.tutor_verifications
    ADD CONSTRAINT tutor_verifications_tutor_id_fkey FOREIGN KEY (tutor_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_achievements user_achievements_achievement_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: studylink
--

ALTER TABLE ONLY public.user_achievements
    ADD CONSTRAINT user_achievements_achievement_id_fkey FOREIGN KEY (achievement_id) REFERENCES public.achievements(id) ON DELETE CASCADE;


--
-- Name: user_achievements user_achievements_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: studylink
--

ALTER TABLE ONLY public.user_achievements
    ADD CONSTRAINT user_achievements_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_login_history user_login_history_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: studylink
--

ALTER TABLE ONLY public.user_login_history
    ADD CONSTRAINT user_login_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_points_log user_points_log_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: studylink
--

ALTER TABLE ONLY public.user_points_log
    ADD CONSTRAINT user_points_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict gYnVADYHAmrvXSFafkpSCt1g0GPAWQctSB8w99Qv7jUH3pl4LulgG0DiF8DVuii


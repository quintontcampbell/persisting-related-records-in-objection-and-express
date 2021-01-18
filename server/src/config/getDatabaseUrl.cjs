const getDatabaseUrl = (nodeEnv) => {
  return (
    {
      development: "postgres://postgres:postgres@localhost:5432/persisting-related-records-in-objection-and-express_development",
      test: "postgres://postgres:postgres@localhost:5432/persisting-related-records-in-objection-and-express_test",
    }[nodeEnv] || process.env.DATABASE_URL
  );
};

module.exports = getDatabaseUrl;
